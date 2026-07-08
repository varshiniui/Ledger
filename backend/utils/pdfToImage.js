import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardFontDataUrl = pathToFileURL(path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/')).toString();

// Renders the first page of a PDF buffer to a PNG image buffer,
// so it can be fed into the same Tesseract OCR pipeline as photo uploads.
export async function pdfBufferToImageBuffer(pdfBuffer) {
  const loadingTask = pdfjsLib.getDocument({ 
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: standardFontDataUrl
  });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;

  return canvas.toBuffer('image/png');
}