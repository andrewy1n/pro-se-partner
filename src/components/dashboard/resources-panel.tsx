import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, ClipboardList, MapPin } from "lucide-react";
import type { DefenseItem, LegalAidItem, ResourcesPanelModel } from "@/lib/types";

interface ResourcesPanelProps {
  model: ResourcesPanelModel | null;
  isDefensesLoading?: boolean;
  isLegalAidLoading?: boolean;
}

export function ResourcesPanel({ model, isDefensesLoading, isLegalAidLoading }: ResourcesPanelProps) {
  const defenses = model?.defenses ?? [];
  const legalAid = model?.legalAid ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Research Results</p>

      <DefensesCard defenses={defenses} isDefensesLoading={isDefensesLoading} />

      <LegalAidCard legalAid={legalAid} isLegalAidLoading={isLegalAidLoading} />
    </div>
  );
}

function PanelEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-stone-50/60 px-6 py-10 text-center">
      <ClipboardList className="h-10 w-10 text-stone-300" strokeWidth={1.25} aria-hidden />
      <p className="mt-3 max-w-sm text-xs leading-relaxed text-stone-500">{message}</p>
    </div>
  );
}

function DefensesCard({
  defenses,
  isDefensesLoading,
}: {
  defenses: DefenseItem[];
  isDefensesLoading?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="app-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-1.5 text-left"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
        ) : (
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
        )}
        <div>
          <h3 className="font-display text-base font-semibold text-stone-900">Applicable Defenses</h3>
          <p className="mt-0.5 text-xs text-stone-500">
            Arguments based on your situation that you may be able to raise in court.
          </p>
        </div>
      </button>

      {open && (
        <div className="mt-4">
          {isDefensesLoading ? (
            <DefenseSkeletons />
          ) : defenses.length === 0 ? (
            <PanelEmptyState message="No defenses identified yet. Run Case Analysis to research defenses for your situation." />
          ) : (
            <div className="space-y-2">
              {defenses.map((defense, i) => (
                <DefenseCard key={i} defense={defense} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LegalAidCard({
  legalAid,
  isLegalAidLoading,
}: {
  legalAid: LegalAidItem[];
  isLegalAidLoading?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="app-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-1.5 text-left"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
        ) : (
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
        )}
        <div>
          <h3 className="font-display text-base font-semibold text-stone-900">Legal Aid Near You</h3>
          <p className="mt-0.5 text-xs text-stone-500">Organizations that may be able to help with your case.</p>
        </div>
      </button>

      {open && (
        <div className="mt-4">
          {isLegalAidLoading ? (
            <LegalAidSkeletons />
          ) : legalAid.length === 0 ? (
            <PanelEmptyState message="No legal aid results yet. Run Case Analysis to find organizations near you." />
          ) : (
            <div className="space-y-2">
              {legalAid.map((org, i) => (
                <LegalAidRow key={i} org={org} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DefenseCard({ defense }: { defense: DefenseItem }) {
  const isStrong = defense.strength === "strong";
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border border-[#E5E7EB] bg-stone-50/50 p-4 shadow-card ${
        isStrong ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-400"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-start sm:justify-between"
      >
        <h4 className="text-sm font-medium leading-snug text-stone-900">{defense.title}</h4>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isStrong ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}
          >
            {isStrong ? "Strong" : "Possible"}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          )}
        </div>
      </button>

      {expanded && (
        <>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{defense.explanation}</p>
          {defense.citations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {defense.citations.map((citation, i) =>
                citation.url ? (
                  <a
                    key={i}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 underline underline-offset-2 transition-colors hover:text-indigo-800"
                  >
                    {citation.title} ↗
                  </a>
                ) : (
                  <span key={i} className="text-xs text-stone-500">
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
    <div className="rounded-xl border border-[#E5E7EB] bg-stone-50/50 p-4 shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-start sm:justify-between"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium leading-snug text-stone-900">
          {org.organizationName}
          {org.mapsUrl && (
            <a
              href={org.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-normal text-indigo-600 underline-offset-2 hover:text-indigo-800 hover:underline"
            >
              <MapPin className="h-3 w-3" aria-hidden />
              Maps
            </a>
          )}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {org.distanceMiles != null && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
              {org.distanceMiles.toFixed(1)} mi
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              org.walkInAvailable ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"
            }`}
          >
            {org.walkInAvailable ? "Walk-in" : "Appt"}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-1 space-y-0.5 text-xs text-stone-600">
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
          className="animate-pulse rounded-xl border border-[#E5E7EB] border-l-4 border-l-stone-200 bg-stone-50 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="h-3.5 w-2/5 rounded bg-stone-200" />
            <div className="h-5 w-14 rounded-full bg-stone-200" />
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-2.5 w-full rounded bg-stone-200/80" />
            <div className="h-2.5 w-4/5 rounded bg-stone-200/80" />
          </div>
          <div className="mt-2 flex gap-2">
            <div className="h-2.5 w-24 rounded bg-stone-200/60" />
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
        <div key={i} className="animate-pulse rounded-xl border border-[#E5E7EB] bg-stone-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="h-3.5 w-1/2 rounded bg-stone-200" />
            <div className="flex gap-1">
              <div className="h-5 w-12 rounded-full bg-stone-200" />
              <div className="h-5 w-14 rounded-full bg-stone-200" />
            </div>
          </div>
          <div className="mt-1.5 space-y-1">
            <div className="h-2.5 w-2/5 rounded bg-stone-200/60" />
            <div className="h-2.5 w-1/3 rounded bg-stone-200/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
