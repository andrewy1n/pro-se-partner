"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm } from "@/components/intake-form";
import { intakeStorageKey } from "@/lib/intake-storage";
import type { IntakeSessionPayload } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleIntakeSubmit(caseSummary: string, uploadedFile: File | null) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
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

      const payload: IntakeSessionPayload = {
        caseFacts: data.caseFacts,
        confidence: data.confidence,
        missingFields: data.missingFields,
        needsHumanReview: data.needsHumanReview,
      };
      sessionStorage.setItem(
        intakeStorageKey(data.sessionId),
        JSON.stringify(payload),
      );

      if (uploadedFile) {
        // TODO: Upload file for Agent 2 preprocessing when a document is attached.
      }

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
          Classifying intake...
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
