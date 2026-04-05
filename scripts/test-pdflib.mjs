/**
 * Test 3: pdf-lib can load a qpdf-cleaned UD-105.
 *
 * Prereq: Test 2 — from the project root:
 *   qpdf --check ud105-test.pdf
 *   qpdf ud105-test.pdf ud105-clean.pdf
 *
 * Run: node scripts/test-pdflib.mjs [path-to-clean.pdf]
 * Default: ./ud105-clean.pdf
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PDFDocument } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const path = process.argv[2] ?? join(root, "ud105-clean.pdf");

if (!existsSync(path)) {
  console.error(
    `Missing: ${path}\n` +
      `Download UD-105: curl -sL -o ud105-test.pdf https://www.courts.ca.gov/documents/ud105.pdf\n` +
      `Then: qpdf ud105-test.pdf ud105-clean.pdf`,
  );
  process.exit(1);
}

const bytes = readFileSync(path);
const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
console.log("Pages:", doc.getPageCount());
const page = doc.getPages()[0];
console.log("Page size:", page.getWidth(), "x", page.getHeight());
console.log("SUCCESS: pdf-lib can read the qpdf-cleaned file");
