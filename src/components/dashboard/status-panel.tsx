import type { StatusPanelModel } from "@/lib/types";

interface StatusPanelProps {
  model: StatusPanelModel | null;
}

export function StatusPanel({ model }: StatusPanelProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-medium text-zinc-200">Status &amp; Timeline</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {/* TODO: Show response countdown and full case arc progress tracker. */}
        {/* TODO: Surface a single call to action when the system is paused. */}
      </p>

      <div className="mt-3 space-y-2 text-sm text-zinc-300">
        <p>Countdown: {model?.countdownLabel ?? "TBD"}</p>
        <p>Current stage: {model?.caseStage ?? "stage-1-intake"}</p>
      </div>
    </section>
  );
}
