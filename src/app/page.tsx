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
        queuedWave1Agents: [],
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
    <main className="min-h-screen bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        {mockIntakeEnabled ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium text-amber-900">Dev: skip Gemini / intake</p>
            <p className="mt-1 text-amber-900/90">
              Open the session page with mock case data (no API calls). You can also visit{" "}
              <code className="rounded-md bg-white px-1.5 py-0.5 text-xs text-amber-950 ring-1 ring-amber-200">
                /?mock=1
              </code>
              .
            </p>
            <button
              type="button"
              onClick={goToMockSession}
              className="mt-3 rounded-lg border border-amber-600 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100"
            >
              Open session with mock data
            </button>
          </div>
        ) : null}
        <IntakeForm onSubmit={handleIntakeSubmit} />
        {isSubmitting && (
          <p className="mt-4 text-sm text-stone-500">
            {submitShowsDocParse
              ? "Taking a careful look at what you shared and your document..."
              : "Taking a careful look at what you shared..."}
          </p>
        )}
        {submitError && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}
      </div>
    </main>
  );
}
