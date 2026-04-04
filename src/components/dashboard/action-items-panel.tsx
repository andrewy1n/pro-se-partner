import type { ActionItemsPanelModel } from "@/lib/types";

interface ActionItemsPanelProps {
  model: ActionItemsPanelModel | null;
}

export function ActionItemsPanel({ model }: ActionItemsPanelProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-medium text-zinc-200">Action Items</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {/* TODO: Render numbered, prioritized checklist with expandable details. */}
        {/* TODO: Show downloadable UD-105 and FW-001 artifacts when available. */}
      </p>

      <div className="mt-3 space-y-2 text-sm text-zinc-300">
        <p>Checklist items: {model?.checklist.length ?? 0}</p>
        <p>Form downloads: {model?.formArtifacts.length ?? 0}</p>
      </div>
    </section>
  );
}
