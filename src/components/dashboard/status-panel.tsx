import type { ReactNode } from "react";
import type { TimelineDisplayModel, TimelinePanelInput } from "@/lib/timeline-display-model";
import { buildTimelineDisplayModel } from "@/lib/timeline-display-model";

interface StatusPanelProps {
  model: TimelinePanelInput | null;
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-zinc-300">
      {items.map((item, i) => (
        <li key={`${i}-${item.slice(0, 48)}`} className="marker:text-zinc-600">
          {item}
        </li>
      ))}
    </ul>
  );
}

function SectionCard({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: ReactNode;
  variant?: "default" | "risk";
}) {
  const shell =
    variant === "risk"
      ? "border-amber-500/25 bg-amber-950/15"
      : "border-zinc-800 bg-zinc-900/40";

  return (
    <div className={`rounded-lg border px-3 py-3 ${shell}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

function renderSources(sources: NonNullable<TimelineDisplayModel["sources"]>) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s) =>
        s.href ? (
          <a
            key={`${s.label}-${s.href}`}
            className="inline-flex max-w-full rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-xs text-blue-300 transition hover:border-zinc-600 hover:text-blue-200"
            href={s.href}
            target="_blank"
            rel="noreferrer"
          >
            {s.label}
          </a>
        ) : (
          <span
            key={s.label}
            className="inline-flex rounded-full border border-zinc-700/90 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300"
          >
            {s.label}
          </span>
        ),
      )}
    </div>
  );
}

export function StatusPanel({ model }: StatusPanelProps) {
  const display = buildTimelineDisplayModel(model);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <header className="border-b border-zinc-800/80 pb-3">
        <h2 className="text-sm font-medium text-zinc-100">Status &amp; Timeline</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Live deadline tracking from the Browser Use session.
        </p>
      </header>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Response deadline
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">{display.headline}</p>
          {display.subheadline ? (
            <p className="mt-2 text-sm text-zinc-500">{display.subheadline}</p>
          ) : null}
        </div>

        <SectionCard label="Current case stage">
          <p className="mt-2 text-sm font-medium text-zinc-200">{display.stageLabel}</p>
        </SectionCard>

        {display.knownFacts.length > 0 ? (
          <SectionCard label="What we know">
            <BulletList items={display.knownFacts} />
          </SectionCard>
        ) : null}

        {display.missingFacts.length > 0 ? (
          <SectionCard label="What we still need">
            <BulletList items={display.missingFacts} />
          </SectionCard>
        ) : null}

        {display.riskText ? (
          <SectionCard label="Risk if missed" variant="risk">
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{display.riskText}</p>
          </SectionCard>
        ) : null}

        {display.trialTimingText ? (
          <SectionCard label="Projected trial timing">
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{display.trialTimingText}</p>
          </SectionCard>
        ) : null}

        {display.nextStepText ? (
          <SectionCard label="Next step">
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{display.nextStepText}</p>
          </SectionCard>
        ) : null}

        {display.sources && display.sources.length > 0 ? (
          <SectionCard label="Sources">{renderSources(display.sources)}</SectionCard>
        ) : null}
      </div>

      <div className="mt-4 text-xs text-zinc-600">
        {/* TODO: Expand this into the full case arc progress tracker from PROJECT.md. */}
      </div>
    </section>
  );
}
