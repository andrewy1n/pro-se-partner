/**
 * Regenerate `src/lib/pdf/forms/ud105-blank.pdf` so pdf-lib can load it.
 *
 * 1. Download fresh: curl -sL -o src/lib/pdf/forms/ud105-blank.pdf https://www.courts.ca.gov/documents/ud105.pdf
 * 2. Run: node scripts/mupdf-clean-ud105.mjs
 * 3. Verify: node -e "import('pdf-lib').then(async ({PDFDocument})=>{const b=require('fs').readFileSync('src/lib/pdf/forms/ud105-blank.pdf'); await PDFDocument.load(b,{ignoreEncryption:true}); console.log('ok')})"
 *
 * Prefer `qpdf ud105.pdf out.pdf` when qpdf is installed — preserves visuals best.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import mupdf from "mupdf";

const p = join(process.cwd(), "src", "lib", "pdf", "forms", "ud105-blank.pdf");
const input = new Uint8Array(readFileSync(p));
const doc = new mupdf.PDFDocument(input);
const buf = doc.saveToBuffer("compress,garbage");
const out = new Uint8Array(buf.asUint8Array());
doc.destroy();
writeFileSync(p, Buffer.from(out));
console.log("Wrote", p, "bytes:", out.length);
