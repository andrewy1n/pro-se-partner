"use client";

import { useState } from "react";
import { Scale } from "lucide-react";

interface IntakeFormProps {
  onSubmit: (caseSummary: string, uploadedFile: File | null) => void | Promise<void>;
}

export function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [caseSummary, setCaseSummary] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  return (
    <section className="w-full rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Scale className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Pro Se Partner
        </h1>
      </div>
      <p className="mt-3 text-lg italic text-stone-600">
        Everything your lawyer would know. Now you do too.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(caseSummary, uploadedFile);
        }}
      >
        <label className="block text-sm font-medium text-stone-800">
          Tell us in your own words
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Papers, dates, who&apos;s involved — as much or as little as you like.
          </span>
          <textarea
            value={caseSummary}
            onChange={(event) => setCaseSummary(event.target.value)}
            className="mt-2 h-40 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder={"e.g. I was served last week and don't know how long I have to respond…"}
          />
        </label>

        <div>
          <label className="block text-sm font-medium text-stone-800">
            Add a document <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <p className="mt-1 text-xs text-stone-500">PDF or photo of filings or letters, if you have them.</p>
          <input
            type="file"
            className="mt-2 w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border file:border-indigo-600 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-50"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setUploadedFile(file);
            }}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
        >
          Continue to my case
        </button>
      </form>
    </section>
  );
}
