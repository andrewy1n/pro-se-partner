import type { ResourcesPanelModel } from "@/lib/types";

interface ResourcesPanelProps {
  model: ResourcesPanelModel | null;
}

export function ResourcesPanel({ model }: ResourcesPanelProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-medium text-zinc-200">Context &amp; Resources</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {/* TODO: Render sourced defense summaries with legal citations. */}
        {/* TODO: Render legal aid resources with distance/hours/eligibility fields. */}
      </p>

      <div className="mt-3 space-y-2 text-sm text-zinc-300">
        <p>Defenses found: {model?.defenses.length ?? 0}</p>
        <p>Legal aid options: {model?.legalAid.length ?? 0}</p>
      </div>
    </section>
  );
}
