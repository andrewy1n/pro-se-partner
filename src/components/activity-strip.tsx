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
  running: "bg-indigo-600",
  done: "bg-emerald-500",
  error: "bg-red-500",
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
          <p className="min-w-0 flex-1 text-stone-800">{item.message}</p>
        </div>
      );
    case "tool_call":
      return (
        <div className="flex items-start gap-2">
          {dot}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-medium text-stone-900">
              <Wrench className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
              <span className="truncate">{item.displayName}</span>
            </p>
            {item.displayValue ? (
              <p className="mt-0.5 text-xs leading-snug text-stone-600">{item.displayValue}</p>
            ) : null}
          </div>
        </div>
      );
    case "thinking":
      return (
        <div className="flex items-start gap-2">
          {dot}
          <div className="min-w-0 flex-1">
            <CollapsibleSection label="Thinking" className="text-stone-700">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-600">
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
            <CollapsibleSection label={item.label} className="text-stone-700">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-stone-500">
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
    <section className="flex shrink-0 flex-col border-t border-[#E5E7EB] bg-white p-4 shadow-card xl:min-h-0 xl:w-80 xl:max-w-sm xl:border-l xl:border-t-0">
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        {panelOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
        )}
        <div>
          <h2 className="font-display text-base font-semibold text-stone-900">Activity Strip</h2>
          {contextLabel ? <p className="text-xs text-stone-500">{contextLabel}</p> : null}
        </div>
      </button>

      {panelOpen && (
        <div className="mt-3 space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-stone-500">No agent updates yet.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[#E5E7EB] bg-[#FAFAF9] px-3 py-2 text-sm shadow-card"
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
