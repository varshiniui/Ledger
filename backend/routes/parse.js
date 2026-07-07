import express from 'express';
import axios from 'axios';

const router = express.Router();

const CATEGORIES = [
  'Travel',
  'Food & Dining',
  'Accommodation',
  'Office Supplies',
  'Software & Subscriptions',
  'Client Entertainment',
  'Fuel & Transport',
  'Communication',
  'Miscellaneous',
];

// Extract the final total amount using regex, since LLMs are unreliable at math
function extractTotal(text) {
  const lines = text.split('\n');
  const totalPattern = /\b(total|grand total|net amount|amount payable)\b/i;
  let bestMatch = null;

  for (const line of lines) {
    if (totalPattern.test(line)) {
      const numbers = line.match(/[\d,]+\.\d{2}|\d+/g);
      if (numbers && numbers.length) {
        const cleaned = numbers[numbers.length - 1].replace(/,/g, '');
        const value = parseFloat(cleaned);
        if (!isNaN(value)) bestMatch = value;
      }
    }
  }
  return bestMatch;
}

function extractGst(text) {
  const lines = text.split('\n');
  const gstPattern = /\b(cgst|sgst|igst|gst)\b/i;
  let sum = 0;
  let found = false;

  for (const line of lines) {
    if (gstPattern.test(line)) {
      const numbers = line.match(/[\d,]+\.\d{2}|\d+/g);
      if (numbers && numbers.length) {
        const cleaned = numbers[numbers.length - 1].replace(/,/g, '');
        const value = parseFloat(cleaned);
        if (!isNaN(value)) {
          sum += value;
          found = true;
        }
      }
    }
  }
  return found ? sum : null;
}

router.post('/parse', async (req, res) => {
  try {
    const { extracted_text } = req.body;

    if (!extracted_text || !extracted_text.trim()) {
      return res.status(400).json({ error: 'extracted_text is required' });
    }

    const regexTotal = extractTotal(extracted_text);
    const regexGst = extractGst(extracted_text);

    const prompt = `You are an expense receipt parser. Given raw OCR text from a receipt, extract structured data.

Return ONLY a valid JSON object, no markdown, no backticks, no explanation. Use this exact shape:

{
  "merchant_name": string or null,
  "expense_date": "YYYY-MM-DD" or null,
  "category": one of [${CATEGORIES.map((c) => `"${c}"`).join(', ')}],
  "category_confidence": number between 0 and 1
}

Rules:
- Do NOT calculate or return any amount fields, only the fields listed above.
- If date format is ambiguous (e.g. DD/MM vs MM/DD), assume DD/MM since this is for Indian receipts.
- Pick the single best-fit category from the list based on the items/merchant described.
- If merchant name is not clearly present, return null, do not guess.

OCR TEXT:
"""
${extracted_text}
"""`;

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let raw = groqResponse.data.choices[0].message.content.trim();
    raw = raw.replace(/```json|```/g, '').trim();
    const llmParsed = JSON.parse(raw);

    const parsed = {
      merchant_name: llmParsed.merchant_name,
      amount: regexTotal,
      gst_amount: regexGst,
      expense_date: llmParsed.expense_date,
      category: llmParsed.category,
      category_confidence: llmParsed.category_confidence,
    };

    res.json({ parsed });
  } catch (err) {
    console.error('Parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse receipt', details: err.message });
  }
});

export default router;