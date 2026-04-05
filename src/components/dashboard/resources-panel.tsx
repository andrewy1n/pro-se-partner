import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import type { DefenseItem, LegalAidItem, ResourcesPanelModel } from "@/lib/types";

interface ResourcesPanelProps {
  model: ResourcesPanelModel | null;
  isDefensesLoading?: boolean;
  isLegalAidLoading?: boolean;
}

export function ResourcesPanel({ model, isDefensesLoading, isLegalAidLoading }: ResourcesPanelProps) {
  const defenses = model?.defenses ?? [];
  const legalAid = model?.legalAid ?? [];
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        {panelOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        )}
        <h2 className="text-sm font-medium text-zinc-200">Context &amp; Resources</h2>
      </button>

      {panelOpen && <div className="mt-4 space-y-5">
        {/* Defenses */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Applicable Defenses
          </h3>
          {isDefensesLoading ? (
            <DefenseSkeletons />
          ) : defenses.length === 0 ? (
            <p className="text-xs text-zinc-600">No defenses identified yet.</p>
          ) : (
            <div className="space-y-2">
              {defenses.map((defense, i) => (
                <DefenseCard key={i} defense={defense} />
              ))}
            </div>
          )}
        </div>

        {/* Legal Aid */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Legal Aid Near You
          </h3>
          {isLegalAidLoading ? (
            <LegalAidSkeletons />
          ) : legalAid.length === 0 ? (
            <p className="text-xs text-zinc-600">No legal aid results yet.</p>
          ) : (
            <div className="space-y-2">
              {legalAid.map((org, i) => (
                <LegalAidRow key={i} org={org} />
              ))}
            </div>
          )}
        </div>
      </div>}
    </section>
  );
}

function DefenseCard({ defense }: { defense: DefenseItem }) {
  const isStrong = defense.strength === "strong";
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 ${
        isStrong ? "border-l-green-500 border-l-4" : "border-l-amber-500 border-l-4"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <h4 className="text-sm font-medium text-zinc-100 leading-snug">{defense.title}</h4>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isStrong
                ? "bg-green-900/60 text-green-400"
                : "bg-amber-900/40 text-amber-400"
            }`}
          >
            {isStrong ? "Strong" : "Possible"}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </div>
      </button>

      {expanded && (
        <>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{defense.explanation}</p>
          {defense.citations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {defense.citations.map((citation, i) =>
                citation.url ? (
                  <a
                    key={i}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
                  >
                    {citation.title} ↗
                  </a>
                ) : (
                  <span key={i} className="text-xs text-zinc-500">
                    {citation.title}
                  </span>
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LegalAidRow({ org }: { org: LegalAidItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium text-zinc-100 leading-snug">
          {org.organizationName}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {org.distanceMiles != null && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {org.distanceMiles.toFixed(1)} mi
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              org.walkInAvailable
                ? "bg-green-900/50 text-green-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {org.walkInAvailable ? "Walk-in" : "Appt"}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-1 space-y-0.5 text-xs text-zinc-500">
          {org.hours && <p>{org.hours}</p>}
          {org.contact && <p>{org.contact}</p>}
          {org.eligibilityNotes && <p className="italic">{org.eligibilityNotes}</p>}
        </div>
      )}
    </div>
  );
}

function DefenseSkeletons() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-zinc-800 border-l-4 border-l-zinc-700 bg-zinc-900/50 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="h-3.5 w-2/5 rounded bg-zinc-800" />
            <div className="h-5 w-14 rounded-full bg-zinc-800" />
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-2.5 w-full rounded bg-zinc-800/70" />
            <div className="h-2.5 w-4/5 rounded bg-zinc-800/70" />
          </div>
          <div className="mt-2 flex gap-2">
            <div className="h-2.5 w-24 rounded bg-zinc-800/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LegalAidSkeletons() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="h-3.5 w-1/2 rounded bg-zinc-800" />
            <div className="flex gap-1">
              <div className="h-5 w-12 rounded-full bg-zinc-800" />
              <div className="h-5 w-14 rounded-full bg-zinc-800" />
            </div>
          </div>
          <div className="mt-1.5 space-y-1">
            <div className="h-2.5 w-2/5 rounded bg-zinc-800/50" />
            <div className="h-2.5 w-1/3 rounded bg-zinc-800/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
