const { readFileSync, writeFileSync } = require('fs');
const { PDFDocument, StandardFonts } = require('pdf-lib');

(async () => {
  const bytes = readFileSync('src/lib/pdf/forms/ud105-blank.pdf');
  console.log('Input size:', bytes.length);

  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  console.log('Pages:', doc.getPageCount());

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPages()[0];
  page.drawText('HELLO TEST', { x: 200, y: 400, size: 20, font });

  const out = await doc.save();
  console.log('Output size:', out.length);
  writeFileSync('test-fill.pdf', out);
  console.log('Done — now open test-fill.pdf in Edge');
})().catch(e => console.error('FAILED:', e.message));
