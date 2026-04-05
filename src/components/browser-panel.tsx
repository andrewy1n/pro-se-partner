"use client";

import { useState } from "react";
import { liveBrowserEmbedUrl } from "@/lib/live-browser-url";
import type { AgentId } from "@/lib/types";

export interface AgentTab {
  agentId: AgentId;
  label: string;
  liveUrl: string | null | undefined;
  status: string | null;
}

interface BrowserPanelProps {
  tabs: AgentTab[];
}

function statusDotClass(status: string | null): string {
  if (status === "running" || status === "created") return "bg-amber-400";
  if (status === "idle" || status === "completed") return "bg-emerald-400";
  if (status === "stopped" || status === "error" || status === "timed_out") return "bg-red-400";
  return "bg-zinc-600";
}

export function BrowserPanel({ tabs }: BrowserPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);

  const effectiveTab =
    tabs.find((t) => t.agentId === selectedAgentId) ??
    tabs.find((t) => t.status === "running") ??
    tabs.find((t) => t.status === "created") ??
    tabs[0] ??
    null;

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="mb-2 text-sm font-medium text-zinc-200">Live Browser</p>
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = tab.agentId === effectiveTab?.agentId;
            return (
              <button
                key={tab.agentId}
                onClick={() => setSelectedAgentId(tab.agentId)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(tab.status)}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto overflow-x-hidden bg-zinc-900/80 p-2">
        {effectiveTab?.liveUrl ? (
          <div className="relative aspect-video w-full max-w-[1280px] shadow-sm">
            <iframe
              src={liveBrowserEmbedUrl(effectiveTab.liveUrl)}
              className="absolute inset-0 h-full w-full rounded-md border-0"
              title="Browser Use live session"
              allow="autoplay; clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
            Browser session preview will render here.
          </div>
        )}
      </div>
    </section>
  );
}
