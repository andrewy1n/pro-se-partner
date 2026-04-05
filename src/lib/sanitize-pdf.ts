import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { logServerEvent } from "@/lib/server-log";

// Eagerly start loading mupdf WASM when this module is first imported.
// By the time a user completes intake → runs Forms Navigator → fill-pdf fires,
// this will have resolved long ago. If it hasn't (first-ever cold start),
// tryMupdf returns null and we fall through to original bytes.
let _mupdf: typeof import("mupdf") | null = null;
let _mupdfAttempted = false;
import("mupdf")
  .then((m) => {
    _mupdf = m;
    _mupdfAttempted = true;
  })
  .catch(() => {
    _mupdfAttempted = true;
  });

/**
 * Try qpdf system binary first (fastest, best xref rewrite).
 * Returns cleaned bytes or null if qpdf is missing / fails.
 */
function tryQpdf(input: Uint8Array): Uint8Array | null {
  const tmp = path.join(os.tmpdir(), `pro-se-pdf-${randomBytes(12).toString("hex")}.pdf`);
  try {
    fs.writeFileSync(tmp, Buffer.from(input));
    execFileSync("qpdf", ["--replace-input", "--warning-exit-0", tmp], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    const out = fs.readFileSync(tmp);
    logServerEvent("pdf_sanitize_qpdf_ok", {
      inputBytes: input.byteLength,
      outputBytes: out.length,
    });
    return new Uint8Array(out);
  } catch {
    return null;
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Fallback: use mupdf WASM to load and re-save the PDF, rebuilding the xref table.
 * MuPDF is far more tolerant of broken structures than pdf-lib.
 * Returns cleaned bytes or null on failure / not yet loaded.
 */
function tryMupdf(input: Uint8Array): Uint8Array | null {
  if (!_mupdf) {
    logServerEvent("pdf_sanitize_mupdf_skipped", {
      reason: _mupdfAttempted ? "mupdf_load_failed" : "mupdf_not_ready_yet",
    });
    return null;
  }
  try {
    const doc = new _mupdf.PDFDocument(input);
    const buf = doc.saveToBuffer("compress,garbage");
    const result = new Uint8Array(buf.asUint8Array());
    doc.destroy();
    logServerEvent("pdf_sanitize_mupdf_ok", {
      inputBytes: input.byteLength,
      outputBytes: result.byteLength,
    });
    return result;
  } catch (err) {
    logServerEvent("pdf_sanitize_mupdf_failed", {
      inputBytes: input.byteLength,
      error: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300),
    });
    return null;
  }
}

/**
 * Sanitize a PDF so pdf-lib can parse the page tree.
 * Priority: qpdf binary → mupdf WASM → original bytes unchanged.
 */
export function sanitizePdf(input: Uint8Array): Uint8Array {
  const fromQpdf = tryQpdf(input);
  if (fromQpdf) return fromQpdf;

  logServerEvent("pdf_sanitize_qpdf_unavailable", {
    inputBytes: input.byteLength,
  });

  const fromMupdf = tryMupdf(input);
  if (fromMupdf) return fromMupdf;

  logServerEvent("pdf_sanitize_all_failed", {
    inputBytes: input.byteLength,
    reason: "qpdf_and_mupdf_both_unavailable_or_failed",
  });
  return input;
}
