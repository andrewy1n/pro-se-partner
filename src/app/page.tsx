"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm } from "@/components/intake-form";
import { intakeStorageKey } from "@/lib/intake-storage";
import { mergeCaseFactsWithDocumentStage } from "@/lib/document-parse-normalize";
import type { IntakeSessionPayload } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitShowsDocParse, setSubmitShowsDocParse] = useState(false);

  async function handleIntakeSubmit(caseSummary: string, uploadedFile: File | null) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitShowsDocParse(!!uploadedFile);
    try {
      const res = await fetch("/api/intake/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseSummary }),
      });

      const data = (await res.json()) as
        | (IntakeSessionPayload & { sessionId: string })
        | { error?: string };

      if (!res.ok || !("sessionId" in data) || !data.sessionId) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Classification failed";
        setSubmitError(message);
        return;
      }

      let parsedDocumentFields: IntakeSessionPayload["parsedDocumentFields"];
      let documentParseError: string | null = null;
      let uploadedFileName: string | null = null;

      if (uploadedFile) {
        uploadedFileName = uploadedFile.name;
        const fd = new FormData();
        fd.append("file", uploadedFile);
        const parseRes = await fetch("/api/intake/parse-document", {
          method: "POST",
          body: fd,
        });
        const parseData = (await parseRes.json()) as
          | { parsedDocumentFields: IntakeSessionPayload["parsedDocumentFields"] }
          | { error?: string };

        if (parseRes.ok && "parsedDocumentFields" in parseData) {
          parsedDocumentFields = parseData.parsedDocumentFields;
        } else {
          documentParseError =
            "error" in parseData && typeof parseData.error === "string"
              ? parseData.error
              : "Document parsing failed";
        }
      }

      let mergedCaseFacts = data.caseFacts;
      if (parsedDocumentFields?.normalizedExtraction?.proceedingStage) {
        mergedCaseFacts = mergeCaseFactsWithDocumentStage(
          data.caseFacts,
          parsedDocumentFields.normalizedExtraction.proceedingStage,
        );
      }

      const payload: IntakeSessionPayload = {
        caseFacts: mergedCaseFacts,
        confidence: data.confidence,
        missingFields: data.missingFields,
        needsHumanReview: data.needsHumanReview,
        parsedDocumentFields,
        uploadedFileName,
        documentParseError,
      };
      sessionStorage.setItem(
        intakeStorageKey(data.sessionId),
        JSON.stringify(payload),
      );

      router.push(`/session/${data.sessionId}`);
    } catch {
      setSubmitError("Network error — try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <IntakeForm onSubmit={handleIntakeSubmit} />
      {isSubmitting && (
        <p className="mx-auto mt-3 max-w-3xl text-sm text-zinc-400">
          {submitShowsDocParse
            ? "Classifying intake and parsing your document..."
            : "Classifying intake..."}
        </p>
      )}
      {submitError && (
        <p className="mx-auto mt-3 max-w-3xl text-sm text-red-400" role="alert">
          {submitError}
        </p>
      )}
    </main>
  );
}
