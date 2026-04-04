"use client";

import type { AgentId } from "@/lib/types";

interface BrowserPanelProps {
  liveUrl: string | null | undefined;
  activeAgentId: AgentId | null;
}

export function BrowserPanel({ liveUrl, activeAgentId }: BrowserPanelProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="text-sm font-medium text-zinc-200">Live Browser</p>
        <p className="text-xs text-zinc-500">
          {/* TODO: Use Wave 1 Forms Agent as default live session. */}
          {/* TODO: Switch to Agent 9 E-Filing session during Stage 2. */}
          Active agent: {activeAgentId ?? "none"}
        </p>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {liveUrl ? (
          <iframe
            src={liveUrl}
            className="h-full w-full border-0"
            title="Browser Use live session"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
            {/* TODO: Replace with session-aware empty/loading states from polling. */}
            Browser session preview will render here.
          </div>
        )}
      </div>
    </section>
  );
}
