"use client";

import { useState } from "react";

interface IntakeFormProps {
  onSubmit: (caseSummary: string, uploadedFile: File | null) => void | Promise<void>;
}

export function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [caseSummary, setCaseSummary] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
      <p className="text-sm font-medium tracking-wide text-zinc-500">Pro Se Partner</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
        You don&apos;t have to figure this out alone
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        For <span className="text-zinc-300">any pro se civil case</span>, describe what happened in plain language. We&apos;ll help you sort deadlines, form filling, form submission, and
        next steps.
      </p>

      <form
        className="mt-6 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(caseSummary, uploadedFile);
        }}
      >
        <label className="block text-sm font-medium text-zinc-200">
          Tell us in your own words
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            Papers, dates, who&apos;s involved — as much or as little as you like.
          </span>
          <textarea
            value={caseSummary}
            onChange={(event) => setCaseSummary(event.target.value)}
            className="mt-2 h-40 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-600"
            placeholder={"e.g. I was served last week and don't know how long I have to respond…"}
          />
        </label>

        <div>
          <label className="block text-sm font-medium text-zinc-200">
            Add a document <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">PDF or photo of filings or letters, if you have them.</p>
          <input
            type="file"
            className="mt-2 w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setUploadedFile(file);
            }}
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
        >
          Continue to my case
        </button>
      </form>
    </section>
  );
}
