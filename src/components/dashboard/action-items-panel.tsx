"use client";

import { useRef, useState } from "react";
import {
  FileDown,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  FileEdit,
  Upload,
  Check,
  ClipboardList,
} from "lucide-react";
import { PdfBlobViewer } from "@/components/pdf-blob-viewer";
import { EfilingGate } from "@/components/efiling-gate";
import { logPdfArtifact } from "@/lib/client-pdf-artifact";
import type { ActionItemsPanelModel, FormArtifact, PdfFillStatus, PdfFillErrorCode } from "@/lib/types";

interface ActionItemsPanelProps {
  model: ActionItemsPanelModel | null;
  pdfFillStatus?: PdfFillStatus;
  pdfFillErrorCode?: PdfFillErrorCode | null;
  pdfFillErrorMessage?: string | null;
  /** When set, shows Auto-fill button on originals. */
  onFillUd105?: () => void | Promise<void>;
  /** True when no UD-105 bytes available or case context missing. */
  fillUd105Disabled?: boolean;
  /** Show e-filing gate when Wave 1 is done and filing not yet started. */
  showEfilingGate?: boolean;
  isEfilingDispatching?: boolean;
  onDispatchEfiling?: (username: string) => void | Promise<void>;
  /** Called when the user uploads a completed form file. */
  onUploadForm?: (file: File) => void | Promise<void>;
}

const FILL_STATUS_LABELS: Record<PdfFillStatus, string> = {
  idle: "",
  preparing: "Preparing PDF fill\u2026",
  filling: "Filling known fields\u2026",
  done: "Filled PDF ready",
  failed: "Fill failed",
};

function fillStatusColor(s: PdfFillStatus): string {
  if (s === "done") return "text-emerald-600";
  if (s === "failed") return "text-amber-600";
  if (s === "preparing" || s === "filling") return "text-indigo-600";
  return "text-stone-500";
}

type AutoFillConfig = {
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  showRetry: boolean;
  showNoSourceHint: boolean;
};

function OriginalArtifactRow({
  artifact,
  onPreviewOpen,
  autoFill,
}: {
  artifact: FormArtifact;
  onPreviewOpen: (blobUrl: string, title: string) => void;
  autoFill?: AutoFillConfig;
}) {
  const label = `Original ${artifact.formCode}`;

  function handlePreview() {
    logPdfArtifact("info", "preview_link_clicked", {
      variant: artifact.variant,
      formCode: artifact.formCode,
      fileName: artifact.fileName,
      urlPrefix: artifact.downloadUrl.slice(0, 40),
    });
    onPreviewOpen(artifact.downloadUrl, `${label} — ${artifact.fileName}`);
  }

  return (
    <li className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-card">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-stone-900">
            {label}
            {artifact.revisionLabel ? (
              <span className="ml-1.5 text-xs text-stone-500">({artifact.revisionLabel})</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-stone-500">{artifact.fileName}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {autoFill ? (
            <button
              type="button"
              disabled={autoFill.disabled}
              onClick={() => void autoFill.onClick()}
              title={
                autoFill.showNoSourceHint
                  ? "Case context or PDF data not ready"
                  : "Fill known fields from your case facts"
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {autoFill.busy ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <FileEdit className="h-3 w-3" aria-hidden />
              )}
              {autoFill.busy
                ? autoFill.showRetry ? "Retrying\u2026" : "Filling\u2026"
                : autoFill.showRetry ? "Retry fill" : "Auto-fill"}
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 transition hover:text-indigo-800"
            onClick={handlePreview}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Preview
          </button>
          <a
            href={artifact.downloadUrl}
            download={artifact.fileName}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 transition hover:text-indigo-800"
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
        </div>
      </div>
      {autoFill?.showNoSourceHint && !autoFill.busy ? (
        <p className="mt-1.5 text-[11px] text-stone-500">
          Run Find &amp; Fill Forms to download UD-105, or ensure case facts are loaded.
        </p>
      ) : null}
    </li>
  );
}

function FilledArtifactRow({
  artifact,
  onPreviewOpen,
}: {
  artifact: FormArtifact;
  onPreviewOpen: (blobUrl: string, title: string) => void;
}) {
  const label = `Pre-filled ${artifact.formCode}`;

  function handlePreview() {
    logPdfArtifact("info", "preview_link_clicked", {
      variant: artifact.variant,
      formCode: artifact.formCode,
      fileName: artifact.fileName,
      urlPrefix: artifact.downloadUrl.slice(0, 40),
    });
    onPreviewOpen(artifact.downloadUrl, `${label} — ${artifact.fileName}`);
  }

  return (
    <li className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 shadow-card">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            <p className="truncate text-sm font-medium text-emerald-950">
              {label}
              {artifact.revisionLabel ? (
                <span className="ml-1.5 text-xs text-emerald-700">({artifact.revisionLabel})</span>
              ) : null}
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs text-stone-600">{artifact.fileName}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-emerald-800 transition hover:text-emerald-950"
            onClick={handlePreview}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Preview
          </button>
          <a
            href={artifact.downloadUrl}
            download={artifact.fileName}
            className="inline-flex items-center gap-1 text-xs text-emerald-800 transition hover:text-emerald-950"
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
        </div>
      </div>
    </li>
  );
}

function UploadFormSection({ onUploadForm }: { onUploadForm: (file: File) => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await Promise.resolve(onUploadForm(file));
      setUploadedName(file.name);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-stone-50/80 px-3 py-3">
      <p className="text-xs font-medium text-stone-800">Upload your completed form</p>
      <p className="mt-0.5 text-xs text-stone-500">
        Filled it out yourself? Upload your signed PDF here for filing.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-card hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          {uploading ? "Uploading\u2026" : "Choose file\u2026"}
        </button>
        {uploadedName && !uploading && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {uploadedName}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}

export function ActionItemsPanel({
  model,
  pdfFillStatus = "idle",
  pdfFillErrorCode = null,
  pdfFillErrorMessage = null,
  onFillUd105,
  fillUd105Disabled = false,
  showEfilingGate = false,
  isEfilingDispatching = false,
  onDispatchEfiling,
  onUploadForm,
}: ActionItemsPanelProps) {
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  const originals = model?.formArtifacts.filter((a) => a.variant === "original") ?? [];
  const filled = model?.formArtifacts.filter((a) => a.variant === "filled") ?? [];
  const hasAnyArtifact = originals.length > 0 || filled.length > 0;
  const showFillStatus = pdfFillStatus !== "idle";
  const fillInProgress = pdfFillStatus === "preparing" || pdfFillStatus === "filling";
  const showFillHandler = typeof onFillUd105 === "function";
  const ud105AutoFill = showFillHandler
    ? {
        onClick: () => void onFillUd105?.(),
        disabled: fillUd105Disabled || fillInProgress,
        busy: fillInProgress,
        showRetry: pdfFillStatus === "failed",
        showNoSourceHint: fillUd105Disabled,
      }
    : undefined;

  return (
    <section className="app-card">
      <h2 className="font-display text-lg font-semibold tracking-tight text-stone-900">Your Next Steps</h2>

      {/* Fill-step status indicator */}
      {showFillStatus && (
        <div className={`mt-3 flex items-center gap-2 text-xs ${fillStatusColor(pdfFillStatus)}`}>
          {(pdfFillStatus === "preparing" || pdfFillStatus === "filling") && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          )}
          {pdfFillStatus === "done" && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
          {pdfFillStatus === "failed" && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
          <span>{FILL_STATUS_LABELS[pdfFillStatus]}</span>
        </div>
      )}

      {/* Fill failure warning */}
      {pdfFillStatus === "failed" && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-950">
            Downloaded official form successfully, but auto-fill failed.
          </p>
          {pdfFillErrorMessage && (
            <p className="mt-1 truncate text-xs text-amber-900/90" title={pdfFillErrorMessage}>
              {pdfFillErrorCode && <span className="mr-1 font-mono">[{pdfFillErrorCode}]</span>}
              {pdfFillErrorMessage}
            </p>
          )}
          {originals.length > 0 && (
            <p className="mt-1 text-xs text-stone-600">
              You can still download and manually fill the original form below.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-4">
        {model && model.checklist.length > 0 && (
          <ul className="space-y-2">
            {model.checklist.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 shadow-card">
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 ${
                    item.status === "done"
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-stone-300 bg-white"
                  }`}
                  aria-hidden
                >
                  {item.status === "done" ? (
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900">{item.title}</p>
                  {item.details ? <p className="mt-0.5 text-xs text-stone-600">{item.details}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!hasAnyArtifact && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-stone-50/60 px-6 py-10 text-center">
            <ClipboardList className="h-10 w-10 text-stone-300" strokeWidth={1.25} aria-hidden />
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-stone-500">
              No forms yet &mdash; run Find &amp; Fill Forms to get started.
            </p>
          </div>
        )}

        {/* Original court form */}
        {originals.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
              Official court form
            </p>
            <ul className="space-y-2">
              {originals.map((a) => (
                <OriginalArtifactRow
                  key={`${a.formCode}-original`}
                  artifact={a}
                  onPreviewOpen={(url, title) => setPdfPreview({ url, title })}
                  autoFill={
                    a.formCode === "UD-105" && a.variant === "original" ? ud105AutoFill : undefined
                  }
                />
              ))}
            </ul>
          </div>
        )}

        {/* Pre-filled version — visually distinct */}
        {filled.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Pre-filled for you
              </p>
            </div>
            <p className="mb-2 text-xs text-stone-500">
              Fields filled from your case information. Review before filing.
            </p>
            <ul className="space-y-2">
              {filled.map((a) => (
                <FilledArtifactRow
                  key={`${a.formCode}-filled`}
                  artifact={a}
                  onPreviewOpen={(url, title) => setPdfPreview({ url, title })}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Upload completed form */}
        {onUploadForm && hasAnyArtifact && (
          <UploadFormSection onUploadForm={onUploadForm} />
        )}

      </div>

      {showEfilingGate && onDispatchEfiling ? (
        <div className="mt-4 border-t border-[#E5E7EB] pt-4">
          <EfilingGate onSubmit={onDispatchEfiling} isDispatching={isEfilingDispatching} />
        </div>
      ) : null}

      {pdfPreview ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="PDF preview"
          onClick={() => setPdfPreview(null)}
        >
          <div
            className="flex h-[min(90vh,920px)] max-h-[92vh] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5E7EB] bg-white px-3 py-2">
              <p className="min-w-0 truncate text-sm font-medium text-stone-900">{pdfPreview.title}</p>
              <button
                type="button"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800"
                aria-label="Close preview"
                onClick={() => setPdfPreview(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PdfBlobViewer key={pdfPreview.url} fileUrl={pdfPreview.url} />
            </div>
            <p className="shrink-0 border-t border-[#E5E7EB] bg-stone-50 px-3 py-2 text-xs text-stone-500">
              Rendered with Mozilla pdf.js (not Chrome&apos;s built-in PDF viewer). If preview fails, use
              Download. The court &ldquo;Original&rdquo; can be strict; &ldquo;Filled&rdquo; uses the bundled form.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
