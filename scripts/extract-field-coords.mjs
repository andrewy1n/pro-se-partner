/**
 * Dev-only: extract AcroForm widget rects from the official UD-105 PDF using pdfjs-dist.
 *
 * Usage:
 *   node scripts/extract-field-coords.mjs [path/to/ud105-original.pdf] [path/to/ud105-blank.pdf]
 *
 * Defaults:
 *   scripts/ud105-original.pdf
 *   src/lib/pdf/forms/ud105-blank.pdf
 *
 * If pdfjs cannot parse your copy of the court PDF, try: `pdftk … dump_data_fields`,
 * Python `pikepdf` / PyPDF2 iterating `/Annots`, or `mutool info …`.
 *
 * Outputs:
 *   - Console: field names, types, rects, scaled x/y
 *   - scripts/ud105-extracted-fields.json
 *   - Overwrites src/lib/pdf/ud105-field-coordinates.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const originalPath = process.argv[2] ?? join(root, "scripts", "ud105-original.pdf");
const blankPath = process.argv[3] ?? join(root, "src", "lib", "pdf", "forms", "ud105-blank.pdf");
const jsonOut = join(root, "scripts", "ud105-extracted-fields.json");
const tsOut = join(root, "src", "lib", "pdf", "ud105-field-coordinates.ts");

function loadPdfBytes(path) {
  return new Uint8Array(readFileSync(path));
}

async function pageSizePoints(pdfDoc, pageIndex1Based) {
  const page = await pdfDoc.getPage(pageIndex1Based);
  const vp = page.getViewport({ scale: 1 });
  return { width: vp.width, height: vp.height };
}

function isWidgetField(a) {
  return a.subtype === "Widget" && !a.pushButton;
}

function fieldKind(a) {
  if (a.checkBox) return "checkbox";
  if (a.fieldType === "Tx") return "text";
  if (a.fieldType === "Btn") return "button";
  if (a.fieldType === "Ch") return "choice";
  return a.fieldType ?? "unknown";
}

function computeDrawCoords(a, scaleX, scaleY) {
  const rect = a.rect;
  const [x1, y1, x2, y2] = rect;
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  const fs = a.defaultAppearanceData?.fontSize ?? 10;

  if (a.checkBox) {
    return {
      x: x1 * scaleX + 1,
      y: y1 * scaleY + 2,
      fontSize: fs,
      maxWidth: undefined,
      isCheckbox: true,
    };
  }

  const tallOrMulti = !!a.multiLine || h > 24;
  let y;
  if (tallOrMulti) {
    const top = Math.max(y1, y2);
    y = top * scaleY - fs * 1.15;
  } else {
    y = Math.min(y1, y2) * scaleY + fs * 0.88;
  }

  return {
    x: Math.min(x1, x2) * scaleX + 1,
    y,
    fontSize: fs,
    maxWidth: w * scaleX,
    isCheckbox: false,
  };
}

async function main() {
  const originalBytes = loadPdfBytes(originalPath);
  const blankBytes = loadPdfBytes(blankPath);

  const originalDoc = await pdfjs.getDocument({ data: originalBytes, disableFontFace: true }).promise;
  const blankDoc = await pdfjs.getDocument({ data: blankBytes, disableFontFace: true }).promise;

  if (originalDoc.numPages !== blankDoc.numPages) {
    console.warn(
      `Warning: page count differs (original ${originalDoc.numPages}, blank ${blankDoc.numPages}).`,
    );
  }

  const meta = {
    originalPath,
    blankPath,
    pages: [],
    scaleSummary: null,
  };

  const extracted = [];

  for (let p = 1; p <= originalDoc.numPages; p++) {
    const oSize = await pageSizePoints(originalDoc, p);
    const bSize =
      p <= blankDoc.numPages ? await pageSizePoints(blankDoc, p) : { width: oSize.width, height: oSize.height };

    const scaleX = bSize.width / oSize.width;
    const scaleY = bSize.height / oSize.height;

    console.log(`Page ${p} dimensions (original):`, oSize.width, "x", oSize.height);
    console.log(`Page ${p} dimensions (blank):`, bSize.width, "x", bSize.height);
    console.log(`Page ${p} scale:`, scaleX, "x", scaleY);

    meta.pages.push({
      page: p,
      original: oSize,
      blank: bSize,
      scaleX,
      scaleY,
    });

    const page = await originalDoc.getPage(p);
    const annots = await page.getAnnotations();

    for (const a of annots) {
      if (!isWidgetField(a)) continue;

      const kind = fieldKind(a);
      const coords = computeDrawCoords(a, scaleX, scaleY);
      const row = {
        pageIndex0: p - 1,
        pageNumber1: p,
        fieldName: a.fieldName,
        kind,
        fieldType: a.fieldType,
        readOnly: !!a.readOnly,
        alternativeText: a.alternativeText ?? null,
        rect: [...a.rect],
        multiLine: !!a.multiLine,
        scaled: {
          ...coords,
          scaleX,
          scaleY,
        },
      };

      extracted.push(row);

      console.log(
        `[p${p}] ${kind.padEnd(8)} ${a.fieldName}\n` +
          `         rect: [${a.rect.map((n) => n.toFixed(3)).join(", ")}]\n` +
          `         draw: x=${coords.x.toFixed(3)} y=${coords.y.toFixed(3)} fs=${coords.fontSize}` +
          (coords.isCheckbox ? " (checkbox)" : "") +
          (coords.maxWidth != null ? ` maxW=${coords.maxWidth.toFixed(1)}` : ""),
      );
    }
  }

  const firstPage = meta.pages[0];
  meta.scaleSummary = firstPage
    ? {
        originalPageWidth: firstPage.original.width,
        originalPageHeight: firstPage.original.height,
        blankPageWidth: firstPage.blank.width,
        blankPageHeight: firstPage.blank.height,
        scaleX: firstPage.scaleX,
        scaleY: firstPage.scaleY,
        dimensionsMatch:
          firstPage.original.width === firstPage.blank.width &&
          firstPage.original.height === firstPage.blank.height,
      }
    : null;

  writeFileSync(jsonOut, JSON.stringify({ meta, fields: extracted }, null, 2), "utf8");
  console.log("\nWrote", jsonOut);

  const tsLines = [];
  tsLines.push(`/**`);
  tsLines.push(` * Auto-generated by scripts/extract-field-coords.mjs from the court PDF form geometry.`);
  tsLines.push(` * pdf-lib: origin bottom-left, points. \`name\` values are exact PDF field names.`);
  tsLines.push(` * If you use PDF field names as \`name\`, add a map in ud105-field-mapping.ts.`);
  if (meta.scaleSummary) {
    const s = meta.scaleSummary;
    tsLines.push(` *`);
    tsLines.push(
      ` * Page 1 scale: original ${s.originalPageWidth}×${s.originalPageHeight} → blank ${s.blankPageWidth}×${s.blankPageHeight} (scaleX=${s.scaleX}, scaleY=${s.scaleY}${s.dimensionsMatch ? ", coordinates align 1:1" : ""}).`,
    );
  }
  tsLines.push(` */`);
  tsLines.push(``);
  tsLines.push(`export interface Ud105FieldCoord {`);
  tsLines.push(`  name: string;`);
  tsLines.push(`  page: number;`);
  tsLines.push(`  x: number;`);
  tsLines.push(`  y: number;`);
  tsLines.push(`  fontSize?: number;`);
  tsLines.push(`  maxWidth?: number;`);
  tsLines.push(`  isCheckbox?: boolean;`);
  tsLines.push(`}`);
  tsLines.push(``);
  tsLines.push(`export const UD105_FIELDS: Ud105FieldCoord[] = [`);

  for (const row of extracted) {
    const c = row.scaled;
    const parts = [
      `name: ${JSON.stringify(row.fieldName)}`,
      `page: ${row.pageIndex0}`,
      `x: ${c.x.toFixed(3)}`,
      `y: ${c.y.toFixed(3)}`,
      `fontSize: ${c.fontSize}`,
    ];
    if (c.maxWidth != null && !c.isCheckbox) {
      parts.push(`maxWidth: ${c.maxWidth.toFixed(3)}`);
    }
    if (c.isCheckbox) {
      parts.push(`isCheckbox: true`);
    }
    tsLines.push(`  { ${parts.join(", ")} },`);
  }

  tsLines.push(`];`);
  tsLines.push(``);

  writeFileSync(tsOut, tsLines.join("\n"), "utf8");
  console.log("Wrote", tsOut);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
