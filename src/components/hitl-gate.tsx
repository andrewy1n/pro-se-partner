"use client";

import { useState } from "react";
import type { CaseFacts } from "@/lib/types";
import { validateSummonsServiceDateVsComplaint } from "@/lib/hitl-summons-service";

// Maps fact keys (snake_case or camelCase from agent) to form config
const FIELD_CONFIG: Record<
  string,
  {
    label: string;
    type: "text" | "date" | "select" | "number";
    caseFact: keyof CaseFacts;
    options?: { value: string; label: string }[];
    hint?: string;
  }
> = {
  service_date: {
    label: "Date Summons and Complaint were delivered to you",
    type: "date",
    caseFact: "serviceDate",
    hint: "The date you were physically handed the court papers after the case was filed—not the date on the 3-day or pay-or-quit notice (often UD-100 item 10(a)).",
  },
  serviceDate: {
    label: "Date Summons and Complaint were delivered to you",
    type: "date",
    caseFact: "serviceDate",
    hint: "The date you were physically handed the court papers after the case was filed—not the date on the 3-day or pay-or-quit notice (often UD-100 item 10(a)).",
  },
  service_method: {
    label: "How were you served?",
    type: "select",
    caseFact: "serviceMethod",
    options: [
      { value: "personal", label: "Personal (handed to me directly)" },
      { value: "substituted", label: "Substituted (left with someone at my home)" },
      { value: "posted_and_mailed", label: "Posted and mailed (taped to door + mailed)" },
    ],
  },
  serviceMethod: {
    label: "How were you served?",
    type: "select",
    caseFact: "serviceMethod",
    options: [
      { value: "personal", label: "Personal (handed to me directly)" },
      { value: "substituted", label: "Substituted (left with someone at my home)" },
      { value: "posted_and_mailed", label: "Posted and mailed (taped to door + mailed)" },
    ],
  },
  eviction_type: { label: "Type of eviction", type: "text", caseFact: "evictionType" },
  evictionType: { label: "Type of eviction", type: "text", caseFact: "evictionType" },
  notice_type: { label: "Type of notice received", type: "text", caseFact: "noticeType" },
  noticeType: { label: "Type of notice received", type: "text", caseFact: "noticeType" },
  jurisdiction: { label: "Jurisdiction / court name", type: "text", caseFact: "jurisdiction" },
  proceeding_stage: { label: "Stage of proceedings", type: "text", caseFact: "proceedingStage" },
  proceedingStage: { label: "Stage of proceedings", type: "text", caseFact: "proceedingStage" },
  claimed_amount: { label: "Amount claimed ($)", type: "number", caseFact: "claimedAmount" },
  claimedAmount: { label: "Amount claimed ($)", type: "number", caseFact: "claimedAmount" },
};

interface HitlGateProps {
  instruction: string;
  missingFacts: string[];
  /** UD-100 plaintiff verification date (ISO); Summons service date must be on or after this. */
  complaintReferenceDateIso?: string | null;
  onSubmit: (updates: Partial<CaseFacts>) => void | Promise<void>;
  /** Omit outer card chrome when embedded in a dialog. */
  embedInModal?: boolean;
}

const fieldClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function HitlGate({
  instruction,
  missingFacts,
  complaintReferenceDateIso = null,
  onSubmit,
  embedInModal = false,
}: HitlGateProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const shellClass = embedInModal
    ? "rounded-lg border-0 bg-transparent p-0"
    : "app-card border-indigo-200";

  // Deduplicate facts that map to the same caseFact key
  const seen = new Set<string>();
  const uniqueFacts = missingFacts.filter((fact) => {
    const config = FIELD_CONFIG[fact];
    const key = config ? config.caseFact : fact;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  function handleChange(fact: string, value: string) {
    setValidationError(null);
    setValues((prev) => ({ ...prev, [fact]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updates: Partial<CaseFacts> = {};

    for (const fact of uniqueFacts) {
      const raw = values[fact];
      if (!raw || raw.trim() === "") continue;
      const config = FIELD_CONFIG[fact];
      if (config) {
        const key = config.caseFact;
        if (config.type === "number") {
          (updates as Record<string, unknown>)[key] = parseFloat(raw);
        } else {
          (updates as Record<string, unknown>)[key] = raw;
        }
      }
    }

    if (complaintReferenceDateIso?.trim()) {
      const serviceIso =
        typeof updates.serviceDate === "string"
          ? updates.serviceDate
          : values.service_date?.trim() || values.serviceDate?.trim() || "";
      if (serviceIso) {
        const check = validateSummonsServiceDateVsComplaint(
          serviceIso,
          complaintReferenceDateIso.trim().slice(0, 10),
        );
        if (!check.ok) {
          setValidationError(check.message);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await Promise.resolve(onSubmit(updates));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className={shellClass}>
        <h2 className="text-sm font-semibold text-indigo-900">Recalculating deadline…</h2>
        <p className="mt-2 text-sm text-stone-600">
          Your answers have been submitted. Response Deadline is re-running now.
        </p>
      </section>
    );
  }

  return (
    <section className={shellClass}>
      {!embedInModal ? (
        <h2 className="font-display text-lg font-semibold text-indigo-900">Action Required</h2>
      ) : null}
      <p className={`text-sm leading-relaxed text-stone-700 ${embedInModal ? "" : "mt-2"}`}>
        {instruction}
      </p>

      {uniqueFacts.length > 0 && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {validationError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {validationError}
            </p>
          ) : null}
          {uniqueFacts.map((fact) => {
            const config = FIELD_CONFIG[fact];
            const label = config
              ? config.label
              : fact.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const inputId = `hitl-${fact}`;

            return (
              <div key={fact} className="flex flex-col gap-1.5">
                <label htmlFor={inputId} className="text-sm font-medium text-stone-800">
                  {label}
                </label>
                {config?.hint ? (
                  <p className="text-xs leading-snug text-stone-500">{config.hint}</p>
                ) : null}

                {config?.type === "select" ? (
                  <select
                    id={inputId}
                    value={values[fact] ?? ""}
                    onChange={(e) => handleChange(fact, e.target.value)}
                    className={fieldClass}
                    required
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {config.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={inputId}
                    type={config?.type ?? "text"}
                    value={values[fact] ?? ""}
                    onChange={(e) => handleChange(fact, e.target.value)}
                    placeholder={config?.type === "date" ? undefined : `Enter ${label.toLowerCase()}`}
                    className={fieldClass}
                    required
                  />
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting\u2026" : "Submit & Recalculate"}
          </button>
        </form>
      )}
    </section>
  );
}
