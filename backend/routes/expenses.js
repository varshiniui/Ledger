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
  evaluateGstConsistency,
} from '../utils/receiptParser.js';
import { pdfBufferToImageBuffer } from '../utils/pdfToImage.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/submit', upload.single('receipt'), async (req, res) => {
  // Declared here (not inside try) so it's still readable in the catch block below.
  let file;
  try {
    file = req.file;
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

    // 2. If it's a PDF, rasterize the first page to an image first
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

    // 5. Duplicate check — this now actually blocks the submission instead of
    // just flagging it. Only an existing 'rejected' claim doesn't count as a
    // block, so a genuinely rejected claim can be resubmitted.
    const hashInput = `${employee_id}_${amount}_${expenseDate}_${merchantName}`.toLowerCase();
    const duplicateHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const { data: existingMatch } = await supabase
      .from('expenses')
      .select('id, status')
      .eq('duplicate_hash', duplicateHash)
      .neq('status', 'rejected')
      .limit(1);

    if (existingMatch && existingMatch.length > 0) {
      return res.status(409).json({
        error: 'Duplicate claim: a claim with the same merchant, amount, and date has already been submitted.',
      });
    }

    const gstConsistency = evaluateGstConsistency(amount, gstAmount);
    const fraudResult = await checkFraud(
      { merchant_name: merchantName, amount, gst_amount: gstAmount, expense_date: expenseDate, category },
      extractedText,
      gstConsistency
    );
    const fraudScore = fraudResult.fraud_score;
    const fraudReason = fraudResult.fraud_reason;

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

// POST /api/expenses/submit-manual — completes a claim when OCR couldn't
// detect a total automatically, using employee-provided figures instead.
router.post('/submit-manual', async (req, res) => {
  try {
    const {
      employee_id,
      receipt_url,
      merchant_name,
      amount,
      gst_amount,
      expense_date,
      category,
    } = req.body;

    if (!employee_id || !receipt_url || !amount || !expense_date || !category) {
      return res.status(400).json({
        error: 'employee_id, receipt_url, amount, expense_date, and category are required',
      });
    }

    const parsedAmount = parseFloat(amount);
    const parsedGst = gst_amount ? parseFloat(gst_amount) : null;

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }

    const hashInput = `${employee_id}_${parsedAmount}_${expense_date}_${merchant_name || ''}`.toLowerCase();
    const duplicateHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const { data: existingMatch } = await supabase
      .from('expenses')
      .select('id, status')
      .eq('duplicate_hash', duplicateHash)
      .neq('status', 'rejected')
      .limit(1);

    if (existingMatch && existingMatch.length > 0) {
      return res.status(409).json({
        error: 'Duplicate claim: a claim with the same merchant, amount, and date has already been submitted.',
      });
    }

    // No OCR text available here, so the fraud model only has the
    // structured fields to work with, not the raw receipt content.
    const gstConsistency = evaluateGstConsistency(parsedAmount, parsedGst);
    const fraudResult = await checkFraud(
      { merchant_name, amount: parsedAmount, gst_amount: parsedGst, expense_date, category },
      '(No OCR text available, this claim was entered manually because automatic extraction failed.)',
      gstConsistency
    );
    const fraudScore = fraudResult.fraud_score;
    const fraudReason = fraudResult.fraud_reason;

    const { data: inserted, error: insertError } = await supabase
      .from('expenses')
      .insert({
        employee_id,
        receipt_url,
        merchant_name: merchant_name || null,
        amount: parsedAmount,
        gst_amount: parsedGst,
        expense_date,
        category,
        ai_category_confidence: null,
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
    console.error('Manual submit error:', err.message);
    res.status(500).json({ error: 'Failed to submit expense', details: err.message });
  }
});

// DELETE /api/expenses/:id — lets an employee withdraw their own claim any
// time before it's been approved. Approved claims can't be deleted since
// they're a settled financial record at that point.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.query;

    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id required' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('id, employee_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (existing.employee_id !== employee_id) {
      return res.status(403).json({ error: 'You can only delete your own claims' });
    }

    if (existing.status === 'approved') {
      return res.status(400).json({ error: 'Approved claims cannot be deleted' });
    }

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete claim', details: err.message });
  }
});

export default router;