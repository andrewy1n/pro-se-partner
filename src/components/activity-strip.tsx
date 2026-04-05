"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { CollapsibleSection } from "@/components/collapsible-section";
import type { ActivityFeedItem } from "@/lib/types";

interface ActivityStripProps {
  items: ActivityFeedItem[];
  /** Current browser tab label (e.g. "Defense Research"); shown under the panel title. */
  contextLabel: string | null;
}

const STATUS_DOT_CLASS: Record<ActivityFeedItem["status"], string> = {
  running: "bg-amber-400",
  done: "bg-emerald-400",
  error: "bg-red-400",
};

function FeedRow({ item }: { item: ActivityFeedItem }) {
  const dot = (
    <span
      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[item.status]}`}
      aria-hidden
    />
  );

  switch (item.feedKind) {
    case "text":
      return (
        <div className="flex items-start gap-2">
          {dot}
          <p className="min-w-0 flex-1 text-zinc-200">{item.message}</p>
        </div>
      );
    case "tool_call":
      return (
        <div className="flex items-start gap-2">
          {dot}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Wrench className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
              <span className="truncate">{item.displayName}</span>
            </p>
            {item.displayValue ? (
              <p className="mt-0.5 text-xs leading-snug text-zinc-400">{item.displayValue}</p>
            ) : null}
          </div>
        </div>
      );
    case "thinking":
      return (
        <div className="flex items-start gap-2">
          {dot}
          <div className="min-w-0 flex-1">
            <CollapsibleSection label="Thinking" className="text-zinc-300">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                {item.fullText}
              </p>
            </CollapsibleSection>
          </div>
        </div>
      );
    case "fallback":
      return (
        <div className="flex items-start gap-2">
          {dot}
          <div className="min-w-0 flex-1">
            <CollapsibleSection label={item.label} className="text-zinc-300">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-zinc-500">
                {item.rawSnippet}
              </pre>
            </CollapsibleSection>
          </div>
        </div>
      );
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

export function ActivityStrip({ items, contextLabel }: ActivityStripProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <section className="flex shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-4 xl:min-h-0 xl:w-80 xl:max-w-sm">
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
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Activity Strip</h2>
          {contextLabel ? (
            <p className="text-xs text-zinc-500">{contextLabel}</p>
          ) : null}
        </div>
      </button>

      {panelOpen && (
        <div className="mt-3 space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">No agent updates yet.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-zinc-800 px-3 py-2 text-sm"
              >
                <FeedRow item={item} />
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
