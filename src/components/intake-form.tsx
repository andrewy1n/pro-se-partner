"use client";

import { useState } from "react";

interface IntakeFormProps {
  onSubmit: (caseSummary: string, uploadedFile: File | null) => void | Promise<void>;
}

export function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [caseSummary, setCaseSummary] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Pro Se Partner Intake</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {/* TODO: Collect plain-language eviction timeline and core case details. */}
        {/* TODO: Validate minimum required input before dispatching Agent 1. */}
      </p>

      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          // TODO: Add submission state and error handling.
          void onSubmit(caseSummary, uploadedFile);
        }}
      >
        <label className="block text-sm text-zinc-300">
          What happened?
          <textarea
            value={caseSummary}
            onChange={(event) => setCaseSummary(event.target.value)}
            className="mt-1 h-36 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            placeholder="Describe notices received, dates, landlord actions, and current court status."
          />
        </label>

        <label className="block text-sm text-zinc-300">
          Optional document upload
          <input
            type="file"
            className="mt-1 w-full text-sm text-zinc-400"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setUploadedFile(file);
            }}
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Start intake
        </button>
      </form>
    </section>
  );
}
