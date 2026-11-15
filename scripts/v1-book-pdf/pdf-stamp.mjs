/**
 * Edition stamp for the book PDF (docs/EDITIONS.md).
 *
 * Chrome writes only /Title, /Creator and /Producer into a PDF's document info, so the edition goes in
 * with an incremental update: a new info dictionary (the old entries kept, Title/Subject/Keywords set)
 * appended after %%EOF with its own xref section and a trailer whose /Prev points at the old one.
 * The original bytes are untouched. Works on PDFs with a classic xref table (what Chrome/Skia writes).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';

/** Escape a JS string as a PDF literal string; non-Latin-1 text becomes UTF-16BE hex. */
function pdfString(text) {
  if (/^[\x20-\x7e]*$/.test(text)) return '(' + text.replace(/([\\()])/g, '\\$1') + ')';
  const buf = Buffer.from('﻿' + text, 'utf16le').swap16();
  return '<' + buf.toString('hex').toUpperCase() + '>';
}

/** The edition list as the agreement check hashes it: [[railKey, submissionId, sha256], ...]. */
export function editionRailsSha256(edition) {
  const rows = (edition.rails || []).map((r) => [r.railKey ?? null, r.submissionId ?? null, r.sha256 ?? null]);
  return createHash('sha256').update(JSON.stringify(rows), 'utf8').digest('hex');
}

export function editionKeywords(edition) {
  return [
    `dp-edition=${edition.editionId}`,
    `dp-edition-status=${edition.status}`,
    `dp-edition-rails-sha256=${editionRailsSha256(edition)}`,
  ].join('; ');
}

/** Append an info dictionary with `fields` (Title, Subject, Keywords, ...) to the PDF at `file`. */
export function stampPdfInfo(file, fields) {
  const pdf = fs.readFileSync(file);
  const tail = pdf.subarray(Math.max(0, pdf.length - 4096)).toString('latin1');
  const trailer = tail.slice(tail.lastIndexOf('trailer'));
  const startxref = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail);
  const size = /\/Size\s+(\d+)/.exec(trailer);
  const root = /\/Root\s+(\d+\s+\d+\s+R)/.exec(trailer);
  if (!startxref || !size || !root) throw new Error(`${file}: no classic trailer found; cannot stamp the edition`);
  const info = /\/Info\s+(\d+)\s+(\d+)\s+R/.exec(trailer);
  const entries = {};
  if (info) {
    const m = new RegExp(`(?:^|[\\r\\n])${info[1]}\\s+${info[2]}\\s+obj\\s*<<([\\s\\S]*?)>>\\s*endobj`).exec(pdf.toString('latin1'));
    if (m) {
      for (const e of m[1].matchAll(/\/(\w+)\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\/\w+|[\d.]+)/g)) entries[e[1]] = e[2];
    }
  }
  for (const [k, v] of Object.entries(fields)) if (v != null) entries[k] = pdfString(String(v));
  const num = Number(size[1]);
  const body = `\n${num} 0 obj\n<<${Object.entries(entries).map(([k, v]) => `/${k} ${v}`).join('\n')}>>\nendobj\n`;
  const objOffset = pdf.length + 1; // after the leading newline
  const xrefOffset = pdf.length + Buffer.byteLength(body, 'latin1');
  const xref = `xref\n${num} 1\n${String(objOffset).padStart(10, '0')} 00000 n \n` +
    `trailer\n<</Size ${num + 1}\n/Root ${root[1]}\n/Info ${num} 0 R\n/Prev ${startxref[1]}>>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  fs.writeFileSync(file, Buffer.concat([pdf, Buffer.from(body + xref, 'latin1')]));
}
