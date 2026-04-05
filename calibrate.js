const { readFileSync, writeFileSync } = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

(async () => {
  const bytes = readFileSync('src/lib/pdf/forms/ud105-blank.pdf');
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  pages.forEach((page, pi) => {
    for (let x = 0; x <= 612; x += 50) {
      for (let y = 0; y <= 792; y += 50) {
        page.drawText(`${x},${y}`, {
          x, y, size: 4, font, color: rgb(0.7, 0.7, 0.7)
        });
      }
    }
    console.log(`Page ${pi + 1}: ${page.getWidth()} x ${page.getHeight()}`);
  });

  const out = await doc.save();
  writeFileSync('calibrate-grid.pdf', out);
  console.log('Open calibrate-grid.pdf to find positions');
})().catch(e => console.error(e.message));
