import type {
  ActivityFeedItem,
  AgentId,
  BrowserUseSessionStatus,
  DeadlineResult,
  MessageResponse,
} from "@/lib/types";

export interface DashboardConversionResult {
  activityFeed: ActivityFeedItem[];
  deadlineResult: DeadlineResult | null;
}

const AGENT_LABELS: Record<AgentId, string> = {
  "agent-1-intake": "Case Intake",
  "agent-2-document-parsing": "Document Parser",
  "agent-3-forms-navigator": "Forms Navigator",
  "agent-3b-pdf-filler": "PDF Filler",
  "agent-4-deadline-procedure": "Deadline Tracker",
  "agent-5-defense-research": "Defense Research",
  "agent-6-legal-aid": "Legal Aid",
  "agent-7-fee-waiver": "Fee Waiver",
  "agent-9-efiling": "E-Filing",
};

export function convertMessagesToActivityFeed(
  messages: MessageResponse[],
  options?: {
    agentId?: AgentId;
    sessionStatus?: BrowserUseSessionStatus | null;
  },
): ActivityFeedItem[] {
  const agentId = options?.agentId ?? "agent-4-deadline-procedure";
  const label = AGENT_LABELS[agentId];
  const terminalStatus = options?.sessionStatus ?? null;

  const visibleMessages = messages
    .filter((message) => !message.hidden)
    .map((message) => ({
      ...message,
      text: normalizeMessageText(message.data),
    }))
    .filter((message) => message.text.length > 0);

  const deduped = visibleMessages.filter((message, index, list) => {
    const previous = list[index - 1];
    return !previous || previous.text !== message.text;
  });

  return deduped.slice(-8).map((message, index, list) => ({
    id: message.id,
    agentId,
    agentLabel: label,
    status: resolveFeedStatus(index, list.length, terminalStatus),
    message: message.text,
    createdAt: message.createdAt,
  }));
}

export function convertMessagesForDashboard(
  input: {
    messages: MessageResponse[];
    deadlineResult: DeadlineResult | null;
    agentId?: AgentId;
    sessionStatus?: BrowserUseSessionStatus | null;
  },
): DashboardConversionResult {
  return {
    activityFeed: convertMessagesToActivityFeed(input.messages, {
      agentId: input.agentId,
      sessionStatus: input.sessionStatus,
    }),
    deadlineResult: input.deadlineResult,
  };
}

function normalizeMessageText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const parsed = tryParseJson(trimmed);
  if (parsed && typeof parsed === "object") {
    const value = extractTextFromObject(parsed);
    if (value) return shorten(value);
  }

  return shorten(trimmed.replace(/\s+/g, " "));
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractTextFromObject(value: object): string | null {
  const candidates = ["message", "text", "content", "summary", "data"] as const;

  for (const key of candidates) {
    const candidate = (value as Record<string, unknown>)[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function resolveFeedStatus(
  index: number,
  total: number,
  sessionStatus: BrowserUseSessionStatus | null,
): ActivityFeedItem["status"] {
  const isLast = index === total - 1;

  if (isLast && sessionStatus === "error") return "error";
  if (isLast && (sessionStatus === "stopped" || sessionStatus === "timed_out")) {
    return "error";
  }
  if (isLast && sessionStatus === "idle") return "done";
  if (isLast && sessionStatus === "running") return "running";
  if (isLast && sessionStatus === "created") return "running";

  return "done";
}

function shorten(text: string): string {
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}...` : text;
}
