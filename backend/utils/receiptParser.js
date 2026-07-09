import axios from 'axios';

export const CATEGORIES = [
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

export function extractTotal(text) {
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

export function extractGst(text) {
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

const GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28];

function digitStripCandidates(value) {
  const candidates = [value];
  const str = value.toString();
  for (let i = 1; i <= 2 && i < str.length - 3; i++) {
    const stripped = parseFloat(str.slice(i));
    if (!isNaN(stripped) && stripped > 0) candidates.push(stripped);
  }
  return candidates;
}

export function correctTotalUsingGst(total, gst) {
  if (!total || !gst) return { amount: total, gstAmount: gst, corrected: false };

  const totalCandidates = digitStripCandidates(total);
  const gstCandidates = digitStripCandidates(gst);

  let best = null;

  for (const t of totalCandidates) {
    for (const g of gstCandidates) {
      const subtotal = t - g;
      if (subtotal <= 0) continue;
      const rate = (g / subtotal) * 100;
      const nearestSlab = GST_SLABS.reduce((closest, slab) =>
        Math.abs(rate - slab) < Math.abs(rate - closest) ? slab : closest
      , GST_SLABS[0]);
      const deviation = Math.abs(rate - nearestSlab);

      if (deviation < 0.3 && (!best || deviation < best.deviation)) {
        best = { total: t, gst: g, deviation };
      }
    }
  }

  if (!best) return { amount: total, gstAmount: gst, corrected: false };

  const corrected = best.total !== total || best.gst !== gst;
  return { amount: best.total, gstAmount: best.gst, corrected };
}

// Deterministic check: does the total/GST math on this claim imply a real
// Indian GST rate? This runs in code, not via the LLM, since arithmetic
// verification should never depend on a language model getting it right.
export function evaluateGstConsistency(total, gst) {
  if (!total || !gst) return { validRate: true, impliedRate: null };
  const subtotal = total - gst;
  if (subtotal <= 0) return { validRate: false, impliedRate: null };
  const rate = (gst / subtotal) * 100;
  const nearestSlab = GST_SLABS.reduce((closest, slab) =>
    Math.abs(rate - slab) < Math.abs(rate - closest) ? slab : closest
  , GST_SLABS[0]);
  const deviation = Math.abs(rate - nearestSlab);
  return { validRate: deviation < 1, impliedRate: rate, nearestSlab, deviation };
}

export async function parseWithGroq(extractedText) {
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
${extractedText}
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
  return JSON.parse(raw);
}

export async function checkFraud(parsedData, extractedText, gstConsistency) {
  const gstNote =
    gstConsistency && !gstConsistency.validRate && gstConsistency.impliedRate !== null
      ? `Important fact, already verified by a separate calculation, not for you to recompute: the implied GST rate on this receipt is approximately ${gstConsistency.impliedRate.toFixed(1)} percent, which does not match any real Indian GST slab (0, 0.25, 3, 5, 12, 18, or 28 percent). This means the subtotal, tax, and total do not reconcile correctly. Treat this as a strong red flag on its own and score accordingly.`
      : '';

  const prompt = `You are a fraud detection analyst reviewing an employee expense claim. Most claims are completely legitimate, be conservative. Only flag genuine red flags, not minor OCR imperfections or missing optional fields.

Claim details:
Merchant: ${parsedData.merchant_name || 'unknown'}
Amount: ${parsedData.amount}
GST: ${parsedData.gst_amount}
Date: ${parsedData.expense_date}
Category: ${parsedData.category}

${gstNote}

Raw receipt text:
"""
${extractedText}
"""

Score high (0.7+) for serious red flags: amount wildly implausible for the category, clear signs of a doctored or edited receipt, tax math that does not reconcile (including the GST fact stated above if present), suspiciously repeated round numbers across multiple line items, or a date far in the future.

Score low (below 0.3) for normal claims. Missing merchant name, missing GST breakdown, or a somewhat old date are NOT fraud signals on their own.

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "fraud_score": number between 0 and 1 (0 = clean, 1 = highly suspicious),
  "fraud_reason": short string explaining the score in plain language
}`;

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
  const parsed = JSON.parse(raw);

  if (gstConsistency && !gstConsistency.validRate && gstConsistency.impliedRate !== null) {
    if (parsed.fraud_score < 0.6) {
      parsed.fraud_score = 0.65;
      parsed.fraud_reason = `Tax math does not reconcile: implied GST rate is approximately ${gstConsistency.impliedRate.toFixed(1)}%, not a valid slab. ${parsed.fraud_reason}`;
    }
  }

  return parsed;
}