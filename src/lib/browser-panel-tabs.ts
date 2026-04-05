import type { AgentId } from "@/lib/types";

export interface AgentTab {
  agentId: AgentId;
  label: string;
  liveUrl: string | null | undefined;
  status: string | null;
}

export function resolveEffectiveBrowserTab(
  tabs: AgentTab[],
  selectedAgentId: AgentId | null,
): AgentTab | null {
  if (tabs.length === 0) return null;
  return (
    tabs.find((t) => t.agentId === selectedAgentId) ??
    tabs.find((t) => t.status === "running") ??
    tabs.find((t) => t.status === "created") ??
    tabs[0] ??
    null
  );
}
