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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAFAF9]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
        <span className="text-sm font-medium text-stone-900">Live Browser</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 shadow-card transition-colors hover:bg-stone-50"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <BrowserPanel
          variant="overlay"
          tabs={tabs}
          effectiveTab={effectiveTab}
          onSelectAgentId={onSelectAgentId}
        />
        <ActivityStrip items={activityItems} contextLabel={contextLabel} />
      </div>
    </div>
  );
}
