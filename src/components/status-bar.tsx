"use client";

import { Clock, Loader2, MonitorPlay } from "lucide-react";
import { getDeadlineUrgency } from "@/lib/deadline-urgency-styles";

interface AgentStatusEntry {
  label: string;
  status: string | null;
}

interface StatusBarProps {
  countdownLabel: string;
  /** ISO date for urgency coloring; omit or null when unknown / TBD. */
  responseDeadlineIso?: string | null;
  agentStatuses: AgentStatusEntry[];
  isPolling: boolean;
  onWatchLive?: () => void;
  showWatchLive?: boolean;
}

function statusDotClass(status: string | null): string {
  if (status === "running" || status === "created") return "bg-indigo-600";
  if (status === "idle" || status === "completed") return "bg-emerald-500";
  if (status === "stopped" || status === "error" || status === "timed_out") return "bg-red-500";
  return "bg-stone-300";
}

function deadlineValueClass(iso: string | null | undefined, displayLabel: string): string {
  const urgency = getDeadlineUrgency(
    iso ?? (displayLabel === "TBD" ? null : displayLabel),
  );
  if (urgency === "passed") return "text-red-600";
  if (urgency === "urgent") return "text-amber-500";
  if (urgency === "pending") return "text-indigo-600";
  return "text-indigo-600";
}

export function StatusBar({
  countdownLabel,
  responseDeadlineIso,
  agentStatuses,
  isPolling,
  onWatchLive,
  showWatchLive,
}: StatusBarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_0_0_rgba(15,23,42,0.04)]">
      <div className="flex min-w-0 items-baseline gap-2 text-sm">
        <Clock className="h-3.5 w-3.5 shrink-0 self-center text-stone-400" />
        <span className="shrink-0 text-stone-500">Deadline:</span>
        <span
          className={`truncate text-base font-semibold tracking-tight ${deadlineValueClass(responseDeadlineIso ?? null, countdownLabel)}`}
        >
          {countdownLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {agentStatuses.map((agent) => (
            <div key={agent.label} className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(agent.status)}`} />
              {agent.label}
            </div>
          ))}
        </div>
        {isPolling && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />}
        {showWatchLive && onWatchLive && (
          <button
            type="button"
            onClick={onWatchLive}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-600 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            Watch Live
          </button>
        )}
      </div>
    </div>
  );
}
