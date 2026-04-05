"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { BrowserPanel } from "@/components/browser-panel";
import { ActivityStrip } from "@/components/activity-strip";
import type { AgentTab } from "@/lib/browser-panel-tabs";
import type { ActivityFeedItem } from "@/lib/types";
import type { AgentId } from "@/lib/types";

interface LiveBrowserOverlayProps {
  open: boolean;
  onClose: () => void;
  tabs: AgentTab[];
  effectiveTab: AgentTab | null;
  onSelectAgentId: (id: AgentId) => void;
  activityItems: ActivityFeedItem[];
  contextLabel: string | null;
}

export function LiveBrowserOverlay({
  open,
  onClose,
  tabs,
  effectiveTab,
  onSelectAgentId,
  activityItems,
  contextLabel,
}: LiveBrowserOverlayProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
        <span className="text-sm font-medium text-zinc-300">Live Browser</span>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <BrowserPanel
          tabs={tabs}
          effectiveTab={effectiveTab}
          onSelectAgentId={onSelectAgentId}
        />
        <ActivityStrip items={activityItems} contextLabel={contextLabel} />
      </div>
    </div>
  );
}
