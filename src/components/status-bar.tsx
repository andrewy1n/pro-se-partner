"use client";

import { Clock, Loader2 } from "lucide-react";

interface AgentStatusEntry {
  label: string;
  status: string | null;
}

interface StatusBarProps {
  countdownLabel: string;
  agentStatuses: AgentStatusEntry[];
  isPolling: boolean;
}

function statusDotClass(status: string | null): string {
  if (status === "running" || status === "created") return "bg-amber-400";
  if (status === "idle" || status === "completed") return "bg-emerald-400";
  if (status === "stopped" || status === "error" || status === "timed_out") return "bg-red-400";
  return "bg-zinc-600";
}

export function StatusBar({ countdownLabel, agentStatuses, isPolling }: StatusBarProps) {
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
      </div>
    </div>
  );
}
