"use client";

import { useState } from "react";
import { FileDown, Eye, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { PdfBlobViewer } from "@/components/pdf-blob-viewer";
import { logPdfArtifact } from "@/lib/client-pdf-artifact";
import type { ActionItemsPanelModel, FormArtifact, PdfFillStatus, PdfFillErrorCode } from "@/lib/types";

interface ActionItemsPanelProps {
  model: ActionItemsPanelModel | null;
  pdfFillStatus: PdfFillStatus;
  pdfFillErrorCode: PdfFillErrorCode | null;
  pdfFillErrorMessage: string | null;
}

const FILL_STATUS_LABELS: Record<PdfFillStatus, string> = {
  idle: "",
  preparing: "Preparing PDF fill\u2026",
  filling: "Filling known fields\u2026",
  done: "Filled PDF ready",
  failed: "Fill failed",
};

function fillStatusColor(s: PdfFillStatus): string {
  if (s === "done") return "text-green-400";
  if (s === "failed") return "text-amber-400";
  if (s === "preparing" || s === "filling") return "text-blue-400";
  return "text-zinc-500";
}

function ArtifactRow({
  artifact,
  onPreviewOpen,
}: {
  artifact: FormArtifact;
  onPreviewOpen: (blobUrl: string, title: string) => void;
}) {
  const label =
    artifact.variant === "original"
      ? `Original ${artifact.formCode}`
      : `Filled ${artifact.formCode}`;

  function handlePreview() {
    logPdfArtifact("info", "preview_link_clicked", {
      variant: artifact.variant,
      formCode: artifact.formCode,
      fileName: artifact.fileName,
      urlPrefix: artifact.downloadUrl.slice(0, 40),
      hint: "Opening in-page pdf.js viewer (no browser PDF plugin).",
    });
    onPreviewOpen(artifact.downloadUrl, `${label} — ${artifact.fileName}`);
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {label}
          {artifact.revisionLabel ? (
            <span className="ml-1.5 text-xs text-zinc-500">
              ({artifact.revisionLabel})
            </span>
          ) : null}
        </p>
        <p className="text-xs text-zinc-500 truncate">{artifact.fileName}</p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 transition"
        title={`Preview ${label}`}
        onClick={handlePreview}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden />
        Preview
      </button>
      <a
        href={artifact.downloadUrl}
        download={artifact.fileName}
        className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 transition"
        title={`Download ${label}`}
        onClick={() =>
          logPdfArtifact("info", "download_link_clicked", {
            variant: artifact.variant,
            formCode: artifact.formCode,
            fileName: artifact.fileName,
          })
        }
      >
        <FileDown className="h-3.5 w-3.5" aria-hidden />
        Download
      </a>
    </li>
  );
}

export function ActionItemsPanel({
  model,
  pdfFillStatus,
  pdfFillErrorCode,
  pdfFillErrorMessage,
}: ActionItemsPanelProps) {
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  const originals = model?.formArtifacts.filter((a) => a.variant === "original") ?? [];
  const filled = model?.formArtifacts.filter((a) => a.variant === "filled") ?? [];
  const hasAnyArtifact = originals.length > 0 || filled.length > 0;
  const showFillStatus = pdfFillStatus !== "idle";

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-medium text-zinc-200">Action Items</h2>

      {/* Fill-step status indicator */}
      {showFillStatus && (
        <div className={`mt-2 flex items-center gap-2 text-xs ${fillStatusColor(pdfFillStatus)}`}>
          {(pdfFillStatus === "preparing" || pdfFillStatus === "filling") && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          )}
          {pdfFillStatus === "done" && (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          )}
          {pdfFillStatus === "failed" && (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>{FILL_STATUS_LABELS[pdfFillStatus]}</span>
        </div>
      )}

      {/* Fill failure warning */}
      {pdfFillStatus === "failed" && (
        <div className="mt-2 rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2">
          <p className="text-xs text-amber-300">
            Downloaded official form successfully, but auto-fill failed.
          </p>
          {pdfFillErrorMessage && (
            <p className="mt-1 text-xs text-amber-400/80 truncate" title={pdfFillErrorMessage}>
              {pdfFillErrorCode && <span className="font-mono mr-1">[{pdfFillErrorCode}]</span>}
              {pdfFillErrorMessage}
            </p>
          )}
          {originals.length > 0 && (
            <p className="mt-1 text-xs text-zinc-400">
              You can still download and manually fill the original form below.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {/* Original downloads */}
        {originals.length > 0 && (
          <ul className="space-y-2">
            {originals.map((a) => (
              <ArtifactRow
                key={`${a.formCode}-original`}
                artifact={a}
                onPreviewOpen={(url, title) => setPdfPreview({ url, title })}
              />
            ))}
          </ul>
        )}

        {/* Filled downloads */}
        {filled.length > 0 && (
          <ul className="space-y-2">
            {filled.map((a) => (
              <ArtifactRow
                key={`${a.formCode}-filled`}
                artifact={a}
                onPreviewOpen={(url, title) => setPdfPreview({ url, title })}
              />
            ))}
          </ul>
        )}

        {!hasAnyArtifact && (
          <p className="text-xs text-zinc-500">
            No forms yet &mdash; use Run Find &amp; Fill Forms.
          </p>
        )}

        {(model?.checklist.length ?? 0) > 0 && (
          <p className="text-xs text-zinc-400 mt-1">
            Checklist items: {model!.checklist.length}
          </p>
        )}
      </div>

      {pdfPreview ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="PDF preview"
          onClick={() => setPdfPreview(null)}
        >
          <div
            className="flex h-[min(90vh,920px)] max-h-[92vh] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
              <p className="min-w-0 truncate text-sm font-medium text-zinc-200">{pdfPreview.title}</p>
              <button
                type="button"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Close preview"
                onClick={() => setPdfPreview(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PdfBlobViewer key={pdfPreview.url} fileUrl={pdfPreview.url} />
            </div>
            <p className="shrink-0 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
              Rendered with Mozilla pdf.js (not Chrome&apos;s built-in PDF viewer). If preview fails, use
              Download. The court &ldquo;Original&rdquo; can be strict; &ldquo;Filled&rdquo; uses the bundled form.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
