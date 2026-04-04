"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm } from "@/components/intake-form";

export default function HomePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleIntakeSubmit(caseSummary: string, uploadedFile: File | null) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // TODO: Create orchestration session and pass intake payload to Agent 1.
      // TODO: Upload file for Agent 2 preprocessing when a document is attached.
      console.info("Scaffold placeholder", { caseSummary, uploadedFile });

      // TODO: Replace this placeholder route id with real session id from API.
      router.push("/session/scaffold-session");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <IntakeForm onSubmit={handleIntakeSubmit} />
      {isSubmitting && (
        <p className="mx-auto mt-3 max-w-3xl text-sm text-zinc-400">
          Preparing intake session...
        </p>
      )}
      {/* TODO: Add pre-submit helper content and optional sample prompts for eviction cases. */}
    </main>
  );
}
