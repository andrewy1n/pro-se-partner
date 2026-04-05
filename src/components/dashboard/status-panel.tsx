"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CollapsibleSection } from "@/components/collapsible-section";
import type { StatusPanelModel } from "@/lib/types";

interface StatusPanelProps {
  model: StatusPanelModel | null;
}

export function StatusPanel({ model }: StatusPanelProps) {
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
        <h2 className="text-sm font-medium text-zinc-200">Status &amp; Timeline</h2>
      </button>

      {panelOpen && (
        <div className="mt-3">
          <div className="space-y-2 text-sm text-zinc-300">
            <p>Countdown: {model?.countdownLabel ?? "TBD"}</p>
            <p>Current stage: {model?.caseStage ?? "stage-1-intake"}</p>
            {model?.consequenceSummary && (
              <p>Missing the deadline: {model.consequenceSummary}</p>
            )}
            {model?.projectedTrialWindow && (
              <p>Projected trial window: {model.projectedTrialWindow}</p>
            )}
            {model?.explanation && <p>Notes: {model.explanation}</p>}
            {model?.missingFacts.length ? (
              <p>Still needed: {model.missingFacts.join(", ")}</p>
            ) : null}
            {model?.callToAction && <p>Next step: {model.callToAction}</p>}
          </div>

          {model?.citations.length ? (
            <CollapsibleSection
              label={`Sources (${model.citations.length})`}
              defaultOpen={false}
              className="mt-4 border-t border-zinc-800 pt-3"
            >
              <div className="space-y-2 text-sm text-zinc-300">
                {model.citations.map((citation) => (
                  <p key={`${citation.title}-${citation.url ?? "local"}`}>
                    {citation.url ? (
                      <a
                        className="text-blue-300 underline underline-offset-2"
                        href={citation.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {citation.title}
                      </a>
                    ) : (
                      citation.title
                    )}
                  </p>
                ))}
              </div>
            </CollapsibleSection>
          ) : null}
        </div>
      )}
    </section>
  );
}
