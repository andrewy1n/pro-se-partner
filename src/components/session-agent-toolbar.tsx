"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCaseContext } from "@/context/case-context";
import { useSession } from "@/context/session-context";
import {
  bytesLookLikePdf,
  hexHead,
  logPdfArtifact,
} from "@/lib/client-pdf-artifact";
import type { PdfFillErrorCode, PdfFillResult } from "@/lib/types";

let pdfArtifactDevToolsHintLogged = false;

interface SessionAgentToolbarProps {
  appSessionId: string;
}

export function SessionAgentToolbar({ appSessionId }: SessionAgentToolbarProps) {
  const { caseContext, addFormArtifact, setPdfFillState } = useCaseContext();
  const {
    activeSession,
    formsNavigatorResult,
    isPolling,
    trackedSession,
    setTrackedSession,
  } = useSession();

  const [isStartingDeadline, setIsStartingDeadline] = useState(false);
  const [isStartingForms, setIsStartingForms] = useState(false);
  const [isPdfFilling, setIsPdfFilling] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const fillOnceRef = useRef(false);
  /** Last pdfBase64 we successfully turned into a blob for the "original" artifact (content-addressed). */
  const lastSurfacedOriginalBase64Ref = useRef<string | null>(null);
  const originalBlobUrlRef = useRef<string | null>(null);
  /** Avoid spamming console when the same bad base64 is polled repeatedly. */
  const lastInvalidOriginalMagicLoggedRef = useRef<string | null>(null);

  const status = activeSession?.status ?? null;
  const agent = trackedSession?.activeAgentId ?? null;
  const isBrowserRunning = status === "running" || status === "created";
  const anyBrowserFlowBusy =
    Boolean(trackedSession?.browserSessionId) &&
    isBrowserRunning &&
    (agent === "agent-4-deadline-procedure" || agent === "agent-3-forms-navigator");

  const resetFillGate = useCallback(() => {
    fillOnceRef.current = false;
    lastSurfacedOriginalBase64Ref.current = null;
    if (originalBlobUrlRef.current) {
      URL.revokeObjectURL(originalBlobUrlRef.current);
      originalBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (trackedSession?.activeAgentId !== "agent-3-forms-navigator") {
      resetFillGate();
    }
  }, [trackedSession?.activeAgentId, resetFillGate]);

  useEffect(() => {
    if (pdfArtifactDevToolsHintLogged) return;
    pdfArtifactDevToolsHintLogged = true;
    console.log(
      "[pdf-artifact] hint | Open the browser DevTools Console (F12 or Ctrl+Shift+J), not the terminal. Filter by: pdf-artifact",
    );
  }, []);

  // Stable primitive — session poll returns a new `ud105` object every ~1s; depending on the
  // object re-runs this effect, sets cancelled=true on the in-flight fill, and skips setPdfFillState(done).
  const ud105PdfBase64 = formsNavigatorResult?.ud105?.pdfBase64 ?? null;

  // Surface original PDF as soon as Forms Navigator produces it, BEFORE calling /fill-pdf.
  // Polls may send a new object every ~1s; pdfBase64 can grow or change until the download is final.
  // Only skip when the base64 *string* matches what we already surfaced; otherwise replace the blob.
  useEffect(() => {
    if (trackedSession?.activeAgentId !== "agent-3-forms-navigator") return;
    if (!ud105PdfBase64) return;
    if (ud105PdfBase64 === lastSurfacedOriginalBase64Ref.current) return;

    const ud105 = formsNavigatorResult?.ud105;
    if (!ud105?.pdfBase64 || ud105.pdfBase64 !== ud105PdfBase64) return;

    let bytes: Uint8Array;
    try {
      const byteString = atob(ud105.pdfBase64);
      bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logPdfArtifact("error", "original_base64_decode_failed", {
        message: msg,
        base64Length: ud105.pdfBase64.length,
        hint: "Payload may be incomplete or not base64; wait for next poll or re-run Forms Navigator.",
      });
      return;
    }

    if (!bytesLookLikePdf(bytes)) {
      if (lastInvalidOriginalMagicLoggedRef.current !== ud105PdfBase64) {
        lastInvalidOriginalMagicLoggedRef.current = ud105PdfBase64;
        logPdfArtifact("error", "original_bytes_not_pdf_magic", {
          byteLength: bytes.length,
          headHex: hexHead(bytes),
          hint: "Browser preview usually fails. Decoded bytes do not start with %PDF.",
        });
      }
      return;
    }

    if (originalBlobUrlRef.current) {
      URL.revokeObjectURL(originalBlobUrlRef.current);
      originalBlobUrlRef.current = null;
    }

    const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
    const downloadUrl = URL.createObjectURL(blob);
    originalBlobUrlRef.current = downloadUrl;

    const previousBase64 = lastSurfacedOriginalBase64Ref.current;
    lastSurfacedOriginalBase64Ref.current = ud105PdfBase64;
    // A longer/corrected payload can arrive on a later poll; allow fill to run again with final bytes.
    if (previousBase64 !== null && previousBase64 !== ud105PdfBase64) {
      fillOnceRef.current = false;
    }

    console.log(
      `[forms-pipeline] Raw PDF received from Forms Navigator | base64Length=${ud105.pdfBase64.length} | byteLength=${bytes.length} | fileName=${ud105.fileName}`,
    );

    addFormArtifact({
      formCode: "UD-105",
      fileName: ud105.fileName,
      downloadUrl,
      revisionLabel: ud105.revisionLabel ?? undefined,
      variant: "original",
    });

    logPdfArtifact("info", "original_blob_ready", {
      variant: "original",
      fileName: ud105.fileName,
      byteLength: bytes.length,
      base64Length: ud105.pdfBase64.length,
      blobUrlPrefix: downloadUrl.slice(0, 32),
      hint: "Preview/Download should work if the browser PDF viewer accepts this file.",
    });
  }, [addFormArtifact, formsNavigatorResult?.ud105, trackedSession?.activeAgentId, ud105PdfBase64]);

  // Run PDF fill once the browser session finishes and original is surfaced.
  // Do NOT put isPdfFilling in deps — toggling it re-runs this effect, cleanup sets cancelled=true,
  // and finally would skip setIsPdfFilling(false), leaving the button stuck on "Filling PDF…".
  useEffect(() => {
    if (!caseContext) return;
    if (trackedSession?.activeAgentId !== "agent-3-forms-navigator") return;
    if (fillOnceRef.current) return;
    if (status !== "idle" && status !== "stopped") return;

    const ud105 = formsNavigatorResult?.ud105;
    const pdfBase64In = ud105?.pdfBase64;
    if (!ud105 || !pdfBase64In) return;

    fillOnceRef.current = true;
    let cancelled = false;
    const revisionLabel = ud105.revisionLabel;

    async function runFill() {
      setIsPdfFilling(true);
      setLastError(null);
      setPdfFillState({ status: "preparing", errorCode: null, errorMessage: null });

      console.log(
        `[forms-pipeline] Fill started | appSessionId=${appSessionId} | base64Length=${pdfBase64In!.length}`,
      );

      try {
        setPdfFillState({ status: "filling", errorCode: null, errorMessage: null });

        const res = await fetch(`/api/sessions/${appSessionId}/fill-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseContext,
            pdfBase64: pdfBase64In,
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
          setLastError(
            "Downloaded official form successfully, but auto-fill failed. You can still use the original.",
          );
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
          setLastError(
            "Downloaded official form successfully, but auto-fill failed. You can still use the original.",
          );
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
          setLastError(
            "Downloaded official form successfully, but auto-fill failed. You can still use the original.",
          );
          return;
        }

        const filledBlob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
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

        setTrackedSession(null);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "PDF fill failed";
        logPdfArtifact("error", "fill_client_throw", { message: msg });
        setPdfFillState({
          status: "failed",
          errorCode: "unknown_fill_error",
          errorMessage: msg,
        });
        setLastError(
          "Downloaded official form successfully, but auto-fill failed. You can still use the original.",
        );
      } finally {
        setIsPdfFilling(false);
      }
    }

    void runFill();
    return () => {
      cancelled = true;
    };
  }, [
    addFormArtifact,
    appSessionId,
    caseContext,
    setPdfFillState,
    setTrackedSession,
    status,
    trackedSession?.activeAgentId,
    ud105PdfBase64,
  ]);

  async function runDeadline() {
    if (!caseContext || isStartingDeadline || anyBrowserFlowBusy || isPdfFilling) return;
    setIsStartingDeadline(true);
    setLastError(null);
    try {
      const res = await fetch(`/api/sessions/${appSessionId}/run-deadline-tracker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Could not start Deadline Tracker",
        );
      }
      const handle = data as {
        sessionId: string;
        liveUrl: string | null;
        status: string;
        activeAgentId: "agent-4-deadline-procedure";
      };
      setTrackedSession({
        appSessionId,
        browserSessionId: handle.sessionId,
        activeAgentId: "agent-4-deadline-procedure",
      });
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setIsStartingDeadline(false);
    }
  }

  async function runFormsNavigator() {
    if (!caseContext || isStartingForms || anyBrowserFlowBusy || isPdfFilling) return;
    resetFillGate();
    setPdfFillState({ status: "idle", errorCode: null, errorMessage: null });
    setIsStartingForms(true);
    setLastError(null);
    try {
      const res = await fetch(`/api/sessions/${appSessionId}/run-forms-navigator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Could not start Forms Navigator",
        );
      }
      const handle = data as {
        sessionId: string;
        liveUrl: string | null;
        status: string;
        activeAgentId: "agent-3-forms-navigator";
      };
      setTrackedSession({
        appSessionId,
        browserSessionId: handle.sessionId,
        activeAgentId: "agent-3-forms-navigator",
      });
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setIsStartingForms(false);
    }
  }

  const controlsLocked = anyBrowserFlowBusy || isPdfFilling;
  const deadlineRunning =
    agent === "agent-4-deadline-procedure" && isBrowserRunning;
  const formsNavRunning =
    agent === "agent-3-forms-navigator" && isBrowserRunning;

  const disableDeadline =
    !caseContext || controlsLocked || isStartingDeadline || isStartingForms;
  const disableForms =
    !caseContext || controlsLocked || isStartingDeadline || isStartingForms;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-medium text-zinc-200">Agents</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Run one browser agent at a time. Find &amp; Fill downloads UD-105 first, then fills it
        offline with pdf-lib (no typing in the PDF viewer).
      </p>
      <p className="mt-1 text-xs text-zinc-600">
        PDF preview diagnostics log in the{" "}
        <span className="text-zinc-400">browser console</span> (F12 → Console, filter{" "}
        <code className="text-zinc-500">pdf-artifact</code>), not in the Next.js terminal.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disableDeadline || formsNavRunning || isPdfFilling}
          onClick={() => void runDeadline()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {(isStartingDeadline || deadlineRunning) && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {deadlineRunning || isStartingDeadline
            ? "Running Status & Timeline\u2026"
            : "Run Status & Timeline"}
        </button>

        <button
          type="button"
          disabled={disableForms || deadlineRunning || isPdfFilling}
          onClick={() => void runFormsNavigator()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {(isStartingForms || formsNavRunning || isPdfFilling) && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {isPdfFilling
            ? "Filling PDF\u2026"
            : formsNavRunning || isStartingForms
              ? "Running Find & Fill Forms\u2026"
              : "Run Find & Fill Forms"}
        </button>
      </div>

      {isPolling && trackedSession ? (
        <p className="mt-3 text-xs text-zinc-500">
          Syncing Browser Use session
          {agent === "agent-3-forms-navigator"
            ? " (Forms Navigator)"
            : " (Deadline Tracker)"}
          \u2026
        </p>
      ) : null}

      {lastError ? (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {lastError}
        </p>
      ) : null}
    </section>
  );
}
