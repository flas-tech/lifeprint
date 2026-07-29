// LifePrint — client-side document reading and finding extraction.
// Files are read with FileReader inside this tab. Nothing is uploaded; there is no server.
import { searchFoods, foodByName, FOODS } from '../engine/foods.js';

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsPromise = null;

export function loadPdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.crossOrigin = 'anonymous';
    s.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error('pdf.js loaded but did not register'));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('pdf.js could not be loaded (offline or blocked)'));
    document.head.append(s);
  });
  return pdfjsPromise;
}

export async function readFile(file) {
  const name = file.name || 'document';
  const ext = name.split('.').pop().toLowerCase();
  const out = { name, size: file.size, ext, pages: 1, text: '', ok: true, note: '' };

  if (['txt', 'md', 'csv', 'tsv', 'json', 'text'].includes(ext) || (file.type || '').startsWith('text/')) {
    out.text = await file.text();
    out.pages = Math.max(1, Math.ceil(out.text.length / 3000));
    return out;
  }

  if (ext === 'pdf' || file.type === 'application/pdf') {
    try {
      const pdfjsLib = await loadPdfJs();
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      out.pages = doc.numPages;
      const chunks = [];
      for (let p = 1; p <= doc.numPages; p += 1) {
        // eslint-disable-next-line no-await-in-loop
        const page = await doc.getPage(p);
        // eslint-disable-next-line no-await-in-loop
        const content = await page.getTextContent();
        chunks.push(`\n[[page ${p}]]\n${content.items.map((i) => i.str).join(' ')}`);
      }
      out.text = chunks.join('\n');
      if (out.text.replace(/\s|\[\[page \d+\]\]/g, '').length < 40) {
        out.ok = false;
        out.note = 'This PDF has no extractable text — it is probably a scan. Enter the findings manually below.';
      }
      return out;
    } catch (err) {
      out.ok = false;
      out.note = `PDF reading is unavailable (${err.message}). Enter the findings manually below.`;
      return out;
    }
  }

  if ((file.type || '').startsWith('image/')) {
    out.ok = false;
    out.note = 'LifePrint does not run OCR on images — that would need a server, and your files never leave this browser. Type the findings in manually below.';
    return out;
  }

  out.ok = false;
  out.note = `“.${ext}” is not a format LifePrint can read. Supported: PDF with text, TXT, MD, CSV. You can always enter findings manually.`;
  return out;
}

const LEVELS = [
  [/\b(very\s+high|class\s*(iv|4)|\+{4})\b/i, 'Very high'],
  [/\b(high|class\s*(iii|3)|\+{3})\b/i, 'High'],
  [/\b(moderate|medium|class\s*(ii|2)|\+{2})\b/i, 'Moderate'],
  [/\b(low|mild|class\s*(i|1)|\+)\b/i, 'Low'],
  [/\b(borderline|equivocal)\b/i, 'Low'],
];

const NEGATIVE = /\b(negative|normal|not detected|none detected|non[- ]?reactive|class\s*0)\b/i;

function levelFor(line) {
  if (NEGATIVE.test(line)) return null;
  for (const [re, label] of LEVELS) if (re.test(line)) return label;
  return null;
}

function pageFor(text, index) {
  const before = text.slice(0, index);
  const marks = [...before.matchAll(/\[\[page (\d+)\]\]/g)];
  return marks.length ? Number(marks[marks.length - 1][1]) : 1;
}

/**
 * Heuristic extraction. Deliberately conservative: it only proposes findings and
 * every one arrives as "Needs confirmation" with a page citation.
 */
export function extractFindings(text, { docName, docType, docId }) {
  const findings = [];
  const seen = new Set();
  const lines = String(text || '').split(/\r?\n|(?<=\s{2})(?=[A-Z][a-z])/);
  let cursor = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const index = text.indexOf(rawLine, cursor);
    cursor = index >= 0 ? index + rawLine.length : cursor;
    if (line.length < 3 || line.length > 220) continue;
    if (/\[\[page \d+\]\]/.test(line)) continue;
    const level = levelFor(line);
    if (!level) continue;

    // find the food this line is about — longest library name mentioned wins
    let best = null;
    const lower = line.toLowerCase();
    for (const f of FOODS) {
      const candidates = [f.name, ...(f.aliases || [])];
      for (const cand of candidates) {
        const c = String(cand).toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
        if (c.length < 3) continue;
        if (lower.includes(c) && (!best || c.length > best.match.length)) best = { food: f, match: c };
      }
    }
    if (!best) continue;
    if (seen.has(best.food.id)) continue;
    seen.add(best.food.id);
    findings.push({
      id: `f-${docId}-${best.food.id}`,
      food: best.food.name,
      foodId: best.food.id,
      level,
      sourceType: 'Uploaded report',
      sourceReference: `${docType || 'Document'} — page ${pageFor(text, Math.max(0, index))}`,
      confidence: level === 'Very high' || level === 'High' ? 'moderate' : 'low',
      status: 'Needs confirmation',
      docId,
      docName,
      excerpt: line.slice(0, 160),
    });
  }
  return findings;
}

/** Fallback for scans and photos: user types "food – level" lines. */
export function parseManualFindings(input, { docId = 'manual', docType = 'Manual entry' } = {}) {
  const out = [];
  for (const raw of String(input || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/\s*[—–\-:,|]\s*/);
    const name = parts[0].trim();
    const levelText = parts.slice(1).join(' ');
    const level = levelFor(levelText || 'moderate') || 'Moderate';
    const hit = foodByName(name) || searchFoods(name)[0];
    out.push({
      id: `f-manual-${out.length}-${Date.now()}`,
      food: hit ? hit.name : name,
      foodId: hit ? hit.id : null,
      level,
      sourceType: 'Manual entry',
      sourceReference: `${docType} — entered by you`,
      confidence: 'low',
      status: 'Needs confirmation',
      docId,
      excerpt: line.slice(0, 160),
      unmatched: !hit,
    });
  }
  return out;
}

export const SUPPORTED_HINT = 'PDF (with selectable text), TXT, MD, CSV. Scans and photos need manual entry.';
