"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm } from "@/components/intake-form";
import { intakeStorageKey } from "@/lib/intake-storage";
import {
  buildMockIntakeSessionPayload,
  MOCK_APP_SESSION_ID,
} from "@/lib/mock-intake-session";
import type { IntakeSessionPayload, IntakeSubmitResponse } from "@/lib/types";

const mockIntakeEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEV_MOCK_INTAKE === "true";

export default function HomePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitShowsDocParse, setSubmitShowsDocParse] = useState(false);

  useEffect(() => {
    if (!mockIntakeEnabled) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mock") !== "1") return;
    const payload = buildMockIntakeSessionPayload();
    sessionStorage.setItem(intakeStorageKey(MOCK_APP_SESSION_ID), JSON.stringify(payload));
    router.replace(`/session/${MOCK_APP_SESSION_ID}`);
  }, [router]);

  function goToMockSession() {
    const payload = buildMockIntakeSessionPayload();
    sessionStorage.setItem(intakeStorageKey(MOCK_APP_SESSION_ID), JSON.stringify(payload));
    router.push(`/session/${MOCK_APP_SESSION_ID}`);
  }

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
        console.error("[intake-submit] failed", {
          httpStatus: res.status,
          message,
          hint:
            res.status === 502
              ? "Server error during AI intake — check the Next.js terminal for intake_submit_error (Gemini/API/quota/model)."
              : undefined,
        });
        setSubmitError(message);
        return;
      }

      console.info("[intake-submit] ok", { sessionId: data.sessionId });

      const payload: IntakeSessionPayload = {
        caseContext: data.caseContext,
        dispatched: false,
        formsNavigatorSession: null,
        deadlineTrackerSession: null,
        defenseResearchSession: null,
        legalAidSession: null,
        efilingSession: null,
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
      {mockIntakeEnabled ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Dev: skip Gemini / intake</p>
          <p className="mt-1 text-amber-100/90">
            Open the session page with mock case data (no API calls). You can also visit{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">/?mock=1</code>.
          </p>
          <button
            type="button"
            onClick={goToMockSession}
            className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
          >
            Open session with mock data
          </button>
        </div>
      ) : null}
      <IntakeForm onSubmit={handleIntakeSubmit} />
      {isSubmitting && (
        <p className="mx-auto mt-3 max-w-3xl text-sm text-zinc-400">
          {submitShowsDocParse
            ? "Taking a careful look at what you shared and your document..."
            : "Taking a careful look at what you shared..."}
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
