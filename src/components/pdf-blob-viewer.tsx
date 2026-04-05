"use client";

import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
import { logPdfArtifact } from "@/lib/client-pdf-artifact";

if (typeof window !== "undefined") {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
}

interface PdfBlobViewerProps {
  /** Blob URL (same-origin) from URL.createObjectURL */
  fileUrl: string;
}

/**
 * Renders a PDF with Mozilla pdf.js (via react-pdf). Does not use the browser's built-in PDF plugin.
 */
export function PdfBlobViewer({ fileUrl }: PdfBlobViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState(720);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setPageWidth(Math.min(900, Math.max(320, window.innerWidth - 120)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setLoadError(null);
    logPdfArtifact("info", "pdfjs_document_loaded", { numPages: n });
  }, []);

  const onLoadError = useCallback((err: Error) => {
    const msg = err?.message ?? String(err);
    setLoadError(msg);
    logPdfArtifact("error", "pdfjs_document_error", { message: msg });
  }, []);

  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto bg-zinc-900/80 px-2 py-3">
      {loadError ? (
        <p className="px-2 text-sm text-amber-400">
          Could not render this PDF in the viewer ({loadError}). Try Download instead.
        </p>
      ) : null}
      <Document
        file={fileUrl}
        loading={
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading PDF…
          </div>
        }
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        options={{
          isEvalSupported: false,
        }}
      >
        {numPages != null &&
          numPages > 0 &&
          Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="mb-4 flex justify-center last:mb-0">
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            </div>
          ))}
      </Document>
    </div>
  );
}
