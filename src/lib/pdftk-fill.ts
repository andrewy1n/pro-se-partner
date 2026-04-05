import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export class PdftkNotInstalledError extends Error {
  readonly code = "pdftk_not_installed" as const;
  constructor() {
    super("pdftk executable not found on PATH (install pdftk-java)");
    this.name = "PdftkNotInstalledError";
  }
}

function isSpawnEnoent(err: unknown): boolean {
  const e = err as NodeJS.ErrnoException | undefined;
  return e?.code === "ENOENT" && typeof e.syscall === "string" && e.syscall.includes("spawn");
}

/** stderr from execFileSync failure (Node attaches on child_process errors). */
function readExecExceptionStderr(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const stderr = (err as { stderr?: Buffer | string }).stderr;
  if (stderr == null) return undefined;
  if (Buffer.isBuffer(stderr)) return stderr.toString("utf8").trimEnd();
  if (typeof stderr === "string") return stderr.trimEnd();
  return undefined;
}

/** Escape PDF literal strings: `\` `(` `)` plus standard PDF escapes for control chars. */
function escapePdfLiteral(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

function isAsciiOnly(str: string): boolean {
  return /^[\x00-\x7F]*$/.test(str);
}

/** UTF-16BE with BOM as PDF hex string, for FDF /T and /V when non-ASCII. */
function utf16BeHexWithBom(str: string): string {
  const units: number[] = [0xfeff];
  for (let i = 0; i < str.length; i++) {
    const cp = str.codePointAt(i)!;
    if (cp > 0xffff) {
      const u = cp - 0x10000;
      units.push(0xd800 + (u >> 10));
      units.push(0xdc00 + (u & 0x3ff));
      i++;
    } else {
      units.push(cp);
    }
  }
  const hex = units.map((u) => u.toString(16).padStart(4, "0").toUpperCase()).join("");
  return `<${hex}>`;
}

function formatFdfStringComponent(str: string): string {
  if (isAsciiOnly(str)) {
    return `(${escapePdfLiteral(str)})`;
  }
  return utf16BeHexWithBom(str);
}

/**
 * Minimal FDF 1.2 document for pdftk fill_form.
 * Field names and values use literal (ASCII) or UTF-16BE hex with BOM when non-ASCII.
 */
export function generateFdf(fields: Record<string, string>): string {
  const entries = Object.entries(fields);
  const fieldParts = entries.map(
    ([name, value]) => `<</T${formatFdfStringComponent(name)}/V${formatFdfStringComponent(value)}>>`,
  );
  return [
    "%FDF-1.2",
    `1 0 obj<</FDF<</Fields[${fieldParts.join("")}]>>>>endobj`,
    "trailer<</Root 1 0 R>>",
    "%%EOF",
    "",
  ].join("\n");
}

function stripLeadingBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

/**
 * Parse `pdftk ... dump_data_fields` stdout for FieldName lines.
 * Handles UTF-8 BOM and normalizes CRLF line endings (field names may contain `#`).
 */
export function parseDumpDataFieldsOutput(text: string): string[] {
  const names: string[] = [];
  const cleaned = stripLeadingBom(text).replace(/\r\n/g, "\n");
  const re = /^FieldName:\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const n = m[1].trim();
    if (n.length) names.push(n);
  }
  return names;
}

export function dumpDataFieldsWithPdftk(pdfBytes: Buffer): string[] {
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `pdftk-dump-${id}.pdf`);
  try {
    fs.writeFileSync(inputPath, pdfBytes);
    let stdout: string;
    try {
      stdout = execFileSync("pdftk", [inputPath, "dump_data_fields"], {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }) as string;
    } catch (err) {
      if (isSpawnEnoent(err)) throw new PdftkNotInstalledError();
      const stderr = readExecExceptionStderr(err);
      const detail = stderr ? `: ${stderr.slice(0, 500)}` : "";
      throw new Error(`pdftk dump_data_fields failed${detail}`);
    }
    return parseDumpDataFieldsOutput(stdout);
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch {
      /* ignore */
    }
  }
}

export async function fillWithPdftk(
  pdfBytes: Buffer,
  fields: Record<string, string>,
): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `pdftk-in-${id}.pdf`);
  const fdfPath = path.join(os.tmpdir(), `pdftk-data-${id}.fdf`);
  const outputPath = path.join(os.tmpdir(), `pdftk-out-${id}.pdf`);
  try {
    fs.writeFileSync(inputPath, pdfBytes);
    const fdfContent = generateFdf(fields);
    fs.writeFileSync(fdfPath, fdfContent, "utf8");
    try {
      execFileSync("pdftk", [inputPath, "fill_form", fdfPath, "output", outputPath], {
        stdio: ["ignore", "ignore", "pipe"],
      });
    } catch (err) {
      if (isSpawnEnoent(err)) throw new PdftkNotInstalledError();
      const stderr = readExecExceptionStderr(err);
      const detail = stderr ? `: ${stderr.slice(0, 800)}` : "";
      throw new Error(`pdftk fill_form failed${detail}`);
    }
    if (!fs.existsSync(outputPath)) {
      throw new Error("pdftk fill_form did not produce an output file");
    }
    return fs.readFileSync(outputPath);
  } finally {
    for (const p of [inputPath, fdfPath, outputPath]) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
}
