import type { StatusPanelModel } from "@/lib/types";

interface StatusPanelProps {
  model: StatusPanelModel | null;
}

export function StatusPanel({ model }: StatusPanelProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-medium text-zinc-200">Status &amp; Timeline</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Live deadline tracking from the Browser Use session.
      </p>

      <div className="mt-3 space-y-2 text-sm text-zinc-300">
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
        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3 text-sm text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Sources</p>
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
      ) : null}
      <div className="mt-4 text-xs text-zinc-500">
        {/* TODO: Expand this into the full case arc progress tracker from PROJECT.md. */}
      </div>
    </section>
  );
}
