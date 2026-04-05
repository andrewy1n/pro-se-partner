"use client";

import { liveBrowserEmbedUrl } from "@/lib/live-browser-url";
import type { AgentId } from "@/lib/types";
import type { AgentTab } from "@/lib/browser-panel-tabs";

export type { AgentTab } from "@/lib/browser-panel-tabs";

interface BrowserPanelProps {
  tabs: AgentTab[];
  onSelectAgentId: (id: AgentId) => void;
  effectiveTab: AgentTab | null;
  /** Hides duplicate title when the parent shell already shows "Live Browser". */
  variant?: "default" | "overlay";
}

function statusDotClass(status: string | null): string {
  if (status === "running" || status === "created") return "bg-indigo-600";
  if (status === "idle" || status === "completed") return "bg-emerald-500";
  if (status === "stopped" || status === "error" || status === "timed_out") return "bg-red-500";
  return "bg-stone-300";
}

export function BrowserPanel({ tabs, onSelectAgentId, effectiveTab, variant = "default" }: BrowserPanelProps) {
  const showTitle = variant !== "overlay";

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="border-b border-[#E5E7EB] bg-white px-4 py-2">
        {showTitle ? <p className="mb-2 text-sm font-medium text-stone-900">Live Browser</p> : null}
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const isActive = tab.agentId === effectiveTab?.agentId;
            return (
              <button
                key={tab.agentId}
                type="button"
                onClick={() => onSelectAgentId(tab.agentId)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-900"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(tab.status)}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-y-auto overflow-x-hidden bg-[#FAFAF9] p-2">
        {effectiveTab?.liveUrl ? (
          <div className="relative aspect-video w-full max-w-[1280px] min-w-0 shadow-sm">
            <iframe
              src={liveBrowserEmbedUrl(effectiveTab.liveUrl)}
              className="absolute inset-0 h-full w-full rounded-md border border-[#E5E7EB] bg-white"
              title="Browser Use live session"
              allow="autoplay; clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-stone-500">
            Browser session preview will render here.
          </div>
        )}
      </div>
    </section>
  );
}
