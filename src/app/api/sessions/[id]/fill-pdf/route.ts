import { NextResponse } from "next/server";
import {
  countInvalidObjectRefHints,
  fillUd105Pdf,
  isCorruptPdfStructureError,
} from "@/lib/pdf-fill-ud105";
import { logServerError, logServerEvent } from "@/lib/server-log";
import type { CanonicalCaseContext, PdfFillResult, PdfFillErrorCode } from "@/lib/types";

export const runtime = "nodejs";

function parseCaseContext(body: unknown): CanonicalCaseContext {
  if (!body || typeof body !== "object") {
    throw new Error('Expected JSON body with "caseContext" and "pdfBase64"');
  }
  const ctx = (body as { caseContext?: unknown }).caseContext;
  if (!ctx || typeof ctx !== "object" || !("caseFacts" in ctx)) {
    throw new Error("caseContext.caseFacts is required");
  }
  return ctx as CanonicalCaseContext;
}

function classifyFillError(err: unknown): PdfFillErrorCode {
  if (isCorruptPdfStructureError(err)) return "corrupt_pdf_structure";
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("encrypted")) return "encrypted_pdf";
  if (msg.includes("XFA") || msg.includes("xfa")) return "xfa_or_unsupported_form";
  if (
    msg.includes("invalid") ||
    msg.includes("Failed to parse") ||
    msg.includes("Invalid object ref")
  )
    return "invalid_pdf_structure";
  return "unknown_fill_error";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing app session id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const caseContext = parseCaseContext(body);
    const pdfBase64 =
      body && typeof body === "object" && typeof (body as { pdfBase64?: unknown }).pdfBase64 === "string"
        ? (body as { pdfBase64: string }).pdfBase64.trim()
        : "";
    if (!pdfBase64) {
      return NextResponse.json({ error: "pdfBase64 is required" }, { status: 400 });
    }

    const raw = Buffer.from(pdfBase64, "base64");
    logServerEvent("fill_pdf_start", {
      appSessionId: id,
      inputBytes: raw.length,
    });

    const filled = await fillUd105Pdf({
      pdfBytes: new Uint8Array(raw),
      caseContext,
    });

    logServerEvent("fill_pdf_ok", {
      appSessionId: id,
      outputBytes: filled.pdfBytes.length,
      missingFields: filled.missingFields,
      warningCount: filled.warnings.length,
      fillSource: "bundled_ud105_blank",
    });

    const response: PdfFillResult = {
      formCode: "UD-105",
      fileName: `UD-105-filled-${id.slice(0, 8)}.pdf`,
      pdfBase64: Buffer.from(filled.pdfBytes).toString("base64"),
      missingFields: filled.missingFields,
      warnings: filled.warnings,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF fill failed";
    const errorCode = classifyFillError(err);
    const invalidRefHints = countInvalidObjectRefHints(message);
    logServerError("fill_pdf_failed", err, {
      appSessionId: id,
      errorCode,
      ...(invalidRefHints !== undefined ? { invalidObjectRefHints: invalidRefHints } : {}),
    });
    const status = message.includes("caseContext") || message.includes("pdfBase64") ? 400 : 502;
    return NextResponse.json({ error: message, errorCode }, { status });
  }
}
