import {
  bytesLookLikePdf,
  hexHead,
  logPdfArtifact,
} from "@/lib/client-pdf-artifact";
import type {
  CanonicalCaseContext,
  FormArtifact,
  PdfFillErrorCode,
  PdfFillResult,
  PdfFillState,
} from "@/lib/types";

/** Parse base64 payload from a `data:application/pdf;base64,...` URL, or null. */
export function extractBase64FromPdfDataUrl(downloadUrl: string): string | null {
  if (!downloadUrl.startsWith("data:")) return null;
  const comma = downloadUrl.indexOf(",");
  if (comma === -1) return null;
  const meta = downloadUrl.slice(0, comma);
  if (!meta.includes("base64")) return null;
  const payload = downloadUrl.slice(comma + 1).trim();
  return payload.length > 0 ? payload : null;
}

export interface RunUd105PdfFillParams {
  appSessionId: string;
  caseContext: CanonicalCaseContext;
  pdfBase64: string;
  revisionLabel?: string | null;
  addFormArtifact: (artifact: FormArtifact) => void;
  setPdfFillState: (state: PdfFillState) => void;
}

export async function runUd105PdfFill({
  appSessionId,
  caseContext,
  pdfBase64,
  revisionLabel,
  addFormArtifact,
  setPdfFillState,
}: RunUd105PdfFillParams): Promise<void> {
  const trimmed = pdfBase64.trim();
  if (!trimmed) {
    setPdfFillState({
      status: "failed",
      errorCode: "FORM_ARTIFACT_MISSING",
      errorMessage: "No UD-105 PDF data available to fill.",
    });
    return;
  }

  setPdfFillState({ status: "preparing", errorCode: null, errorMessage: null });
  console.log(
    `[forms-pipeline] Fill started | appSessionId=${appSessionId} | base64Length=${trimmed.length}`,
  );

  try {
    setPdfFillState({ status: "filling", errorCode: null, errorMessage: null });

    const res = await fetch(`/api/sessions/${appSessionId}/fill-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseContext,
        pdfBase64: trimmed,
      }),
    });
    const data = (await res.json()) as
      | PdfFillResult
      | { error?: string; errorCode?: PdfFillErrorCode };

    if (!res.ok || !("pdfBase64" in data)) {
      const errorCode =
        "errorCode" in data && typeof data.errorCode === "string"
          ? (data.errorCode as PdfFillErrorCode)
          : "unknown_fill_error";
      const msg =
        "error" in data && typeof data.error === "string"
          ? data.error
          : "PDF fill failed";

      logPdfArtifact("error", "fill_api_error", {
        httpStatus: res.status,
        errorCode,
        message: msg,
      });

      setPdfFillState({ status: "failed", errorCode, errorMessage: msg });
      return;
    }

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logPdfArtifact("error", "filled_base64_decode_failed", { message: msg });
      setPdfFillState({
        status: "failed",
        errorCode: "unknown_fill_error",
        errorMessage: "Could not decode filled PDF from server",
      });
      return;
    }

    if (!bytesLookLikePdf(bytes)) {
      logPdfArtifact("error", "filled_bytes_not_pdf_magic", {
        byteLength: bytes.length,
        headHex: hexHead(bytes),
        hint: "Server returned bytes that are not a PDF; preview will fail. Check server fill_pdf logs.",
      });
      setPdfFillState({
        status: "failed",
        errorCode: "invalid_pdf_structure",
        errorMessage: "Filled output did not look like a PDF",
      });
      return;
    }

    const filledBlob = new Blob([Uint8Array.from(bytes)], {
      type: "application/pdf",
    });
    const filledUrl = URL.createObjectURL(filledBlob);
    addFormArtifact({
      formCode: "UD-105",
      fileName: data.fileName,
      downloadUrl: filledUrl,
      revisionLabel: revisionLabel ?? undefined,
      variant: "filled",
    });

    setPdfFillState({ status: "done", errorCode: null, errorMessage: null });

    logPdfArtifact("info", "filled_blob_ready", {
      variant: "filled",
      fileName: data.fileName,
      byteLength: bytes.length,
      missingFields: data.missingFields,
      warningCount: data.warnings.length,
      blobUrlPrefix: filledUrl.slice(0, 32),
      hint: "If Preview still fails, try Download instead.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF fill failed";
    logPdfArtifact("error", "fill_client_throw", { message: msg });
    setPdfFillState({
      status: "failed",
      errorCode: "unknown_fill_error",
      errorMessage: msg,
    });
  }
}
