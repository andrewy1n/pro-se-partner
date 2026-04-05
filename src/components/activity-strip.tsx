"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ActivityFeedItem } from "@/lib/types";

interface ActivityStripProps {
  items: ActivityFeedItem[];
}

const STATUS_DOT_CLASS: Record<ActivityFeedItem["status"], string> = {
  running: "bg-amber-400",
  done: "bg-emerald-400",
  error: "bg-red-400",
};

export function ActivityStrip({ items }: ActivityStripProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
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
        <h2 className="text-sm font-medium text-zinc-200">Activity Strip</h2>
      </button>

      {panelOpen && (
        <div className="mt-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">No agent updates yet.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200"
              >
                <span
                  className={`mt-1 inline-block h-2 w-2 rounded-full ${STATUS_DOT_CLASS[item.status]}`}
                  aria-hidden
                />
                <p>
                  {item.agentLabel}: {item.message}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
