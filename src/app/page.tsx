"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm } from "@/components/intake-form";
import { intakeStorageKey } from "@/lib/intake-storage";
import type { IntakeSessionPayload, IntakeSubmitResponse } from "@/lib/types";

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
      const formData = new FormData();
      formData.append("caseSummary", caseSummary);
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      }

      const res = await fetch("/api/intake/submit", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as
        | IntakeSubmitResponse
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
        caseContext: data.caseContext,
        deadlineTrackerSession: data.deadlineTrackerSession ?? null,
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
            ? "Analyzing your situation and uploaded document..."
            : "Analyzing your situation..."}
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
