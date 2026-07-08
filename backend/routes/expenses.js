import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import supabase from '../config/supabase.js';
import {
  extractTotal,
  extractGst,
  parseWithGroq,
  checkFraud,
  correctTotalUsingGst,
} from '../utils/receiptParser.js';
import { pdfBufferToImageBuffer } from '../utils/pdfToImage.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/submit', upload.single('receipt'), async (req, res) => {
  try {
    const file = req.file;
    const { employee_id } = req.body;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!employee_id) return res.status(400).json({ error: 'employee_id required' });

    // 1. Upload original file to Supabase Storage (keep the real PDF/image on record)
    const fileName = `${employee_id}_${Date.now()}_${file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    const receiptUrl = urlData.publicUrl;

    // 2. If it's a PDF, rasterize the first page to an image first —
    // Tesseract only reads images, not PDF structure.
    let imageBuffer = file.buffer;
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      try {
        imageBuffer = await pdfBufferToImageBuffer(file.buffer);
      } catch (pdfErr) {
        console.error('PDF conversion error:', pdfErr.message);
        return res.status(422).json({
          error: 'Could not read this PDF. Try a scanned image instead, or a simpler PDF export.',
          receipt_url: receiptUrl,
        });
      }
    }

    // 3. OCR (with sharp preprocessing for accuracy)
    const preprocessedBuffer = await sharp(imageBuffer)
      .resize({ width: 1600 })
      .grayscale()
      .normalize()
      .toBuffer();

    const worker = await Tesseract.createWorker('eng');
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
    });
    const { data: ocrResult } = await worker.recognize(preprocessedBuffer);
    await worker.terminate();
    const extractedText = ocrResult.text || '';

    console.log('OCR TEXT:', extractedText);

    if (!extractedText.trim()) {
      return res.status(422).json({
        error: 'No text detected in receipt. Try a clearer photo or scan.',
      });
    }

    // 4. Parse (regex for numbers, Groq for judgment fields)
    const regexTotal = extractTotal(extractedText);
    const regexGst = extractGst(extractedText);
    const llmParsed = await parseWithGroq(extractedText);

    console.log('EXTRACTED TOTAL:', regexTotal, 'EXTRACTED GST:', regexGst);

    const { amount, gstAmount, corrected } = correctTotalUsingGst(regexTotal, regexGst);

    if (corrected) {
      console.log(`OCR auto-corrected: total ${regexTotal} -> ${amount}, gst ${regexGst} -> ${gstAmount}`);
    }

    const merchantName = llmParsed.merchant_name;
    const expenseDate = llmParsed.expense_date;
    const category = llmParsed.category;
    const categoryConfidence = llmParsed.category_confidence;

    if (!amount) {
      return res.status(422).json({
        error: 'Could not detect total amount on this receipt. Please enter it manually.',
        extracted_text: extractedText,
        receipt_url: receiptUrl,
      });
    }

    // 5. Duplicate hash
    const hashInput = `${employee_id}_${amount}_${expenseDate}_${merchantName}`.toLowerCase();
    const duplicateHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const { data: existingMatch } = await supabase
      .from('expenses')
      .select('id')
      .eq('duplicate_hash', duplicateHash)
      .limit(1);

    let fraudScore, fraudReason;

    if (existingMatch && existingMatch.length > 0) {
      fraudScore = 1;
      fraudReason = 'Duplicate claim: matching merchant, amount, and date already submitted.';
    } else {
      const fraudResult = await checkFraud(
        { merchant_name: merchantName, amount, gst_amount: gstAmount, expense_date: expenseDate, category },
        extractedText
      );
      fraudScore = fraudResult.fraud_score;
      fraudReason = fraudResult.fraud_reason;
    }

    // 6. Save
    const { data: inserted, error: insertError } = await supabase
      .from('expenses')
      .insert({
        employee_id,
        receipt_url: receiptUrl,
        merchant_name: merchantName,
        amount,
        gst_amount: gstAmount,
        expense_date: expenseDate,
        category,
        ai_category_confidence: categoryConfidence,
        duplicate_hash: duplicateHash,
        fraud_score: fraudScore,
        fraud_reason: fraudReason,
        status: fraudScore >= 0.75 ? 'finance_review' : 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ expense: inserted });
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).json({
      error: 'Failed to submit expense',
      details: `${err.message} (File: ${file?.originalname}, Mime: ${file?.mimetype}, Size: ${file?.size})`
    });
  }
});

export default router;