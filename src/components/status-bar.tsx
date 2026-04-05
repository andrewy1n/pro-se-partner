"use client";

import { Clock, Loader2, MonitorPlay } from "lucide-react";

interface AgentStatusEntry {
  label: string;
  status: string | null;
}

interface StatusBarProps {
  countdownLabel: string;
  agentStatuses: AgentStatusEntry[];
  isPolling: boolean;
  onWatchLive?: () => void;
  showWatchLive?: boolean;
}

function statusDotClass(status: string | null): string {
  if (status === "running" || status === "created") return "bg-amber-400";
  if (status === "idle" || status === "completed") return "bg-emerald-400";
  if (status === "stopped" || status === "error" || status === "timed_out") return "bg-red-400";
  return "bg-zinc-600";
}

export function StatusBar({ countdownLabel, agentStatuses, isPolling, onWatchLive, showWatchLive }: StatusBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-zinc-400">Deadline:</span>
        <span className="font-medium text-zinc-100">{countdownLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        {agentStatuses.map((agent) => (
          <div key={agent.label} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(agent.status)}`} />
            {agent.label}
          </div>
        ))}
        {isPolling && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
        )}
        {showWatchLive && onWatchLive && (
          <button
            onClick={onWatchLive}
            className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            Watch Live
          </button>
        )}
      </div>
    </div>
  );
}
