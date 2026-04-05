import type {
  ActivityFeedItem,
  AgentId,
  BrowserUseSessionStatus,
  DeadlineResult,
  MessageResponse,
} from "@/lib/types";
import {
  getToolDisplayValue,
  getToolLabel,
  isHiddenTool,
  type ToolStatus,
} from "@/lib/tool-labels";

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

/** Tool calls omitted from the activity strip (noise). */
const TOOL_CALLS_OMIT = new Set(["python"]);

type FeedBase = {
  agentId: AgentId;
  agentLabel: string;
  status: ActivityFeedItem["status"];
  createdAt: string;
};

function shouldOmitToolCall(toolName: string): boolean {
  const n = toolName.toLowerCase();
  if (TOOL_CALLS_OMIT.has(n)) return true;
  if (isHiddenTool(toolName)) return true;
  return false;
}

function resolveToolLabelStatus(
  msgIndex: number,
  sliceLength: number,
  sessionStatus: BrowserUseSessionStatus | null,
): ToolStatus {
  const isLastMessage = msgIndex === sliceLength - 1;
  if (!isLastMessage) return "completed";
  if (sessionStatus === null) return "completed";
  if (
    sessionStatus === "error" ||
    sessionStatus === "stopped" ||
    sessionStatus === "timed_out"
  ) {
    return "error";
  }
  if (sessionStatus === "created" || sessionStatus === "running") return "running";
  return "completed";
}

/**
 * Raw page/DOM snapshots, CSS, scraped boilerplate, and tool-style dict dumps —
 * not useful in the human-facing activity strip.
 */
function isActivityFeedNoiseText(text: string): boolean {
  const t = text;
  const lower = t.toLowerCase();

  if (
    lower.includes("background-color:") ||
    lower.includes("font-family:") ||
    lower.includes(".wp-block") ||
    lower.includes("wp-block-button") ||
    lower.includes("border-width:") ||
    lower.includes("letter-spacing:") ||
    lower.includes("line-height:") ||
    (lower.includes("{color:") && lower.includes("font-size:"))
  ) {
    return true;
  }

  if (/===\s*\d+\s*@\s*\d+\s*===/.test(t)) return true;
  if (/===\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|button|link|textbox)\s*===/i.test(t)) {
    return true;
  }

  if (/^\[\d+\]:/.test(t.trim())) return true;

  if (/\{'organizationName':/.test(t) || /:\s*\{['"]organizationName['"]:/.test(t)) {
    return true;
  }

  if (/^\s*[\w\s&,]+:\s*\{['"][\w]+['"]:\s*['"]/.test(t)) {
    return true;
  }

  if (t.includes("&nbsp;") && /support our work|capital campaign|wildfire relief/i.test(t)) {
    return true;
  }

  return false;
}

function filterNoiseFromItems(items: ActivityFeedItem[]): ActivityFeedItem[] {
  return items.filter((item) => {
    if (item.feedKind === "text") {
      return !isActivityFeedNoiseText(item.message);
    }
    if (item.feedKind === "thinking") {
      return !isActivityFeedNoiseText(item.fullText);
    }
    return true;
  });
}

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

  const visibleMessages = messages.filter((message) => !message.hidden);

  const deduped = visibleMessages.filter((message, index, list) => {
    const previous = list[index - 1];
    return !previous || previous.data !== message.data;
  });

  const slice = deduped.slice(-8);
  const out: ActivityFeedItem[] = [];

  for (let msgIndex = 0; msgIndex < slice.length; msgIndex++) {
    const message = slice[msgIndex]!;
    const status = resolveFeedStatus(msgIndex, slice.length, terminalStatus);
    const base: FeedBase = {
      agentId,
      agentLabel: label,
      status,
      createdAt: message.createdAt,
    };
    const toolLabelStatus = resolveToolLabelStatus(msgIndex, slice.length, terminalStatus);
    const items = filterNoiseFromItems(messageToFeedItems(message, base, toolLabelStatus));
    out.push(...items);
  }

  return dedupeConsecutiveTextRows(out).slice(-32);
}

function dedupeConsecutiveTextRows(items: ActivityFeedItem[]): ActivityFeedItem[] {
  const result: ActivityFeedItem[] = [];
  for (const item of items) {
    const prev = result[result.length - 1];
    if (
      item.feedKind === "text" &&
      prev?.feedKind === "text" &&
      prev.message === item.message
    ) {
      continue;
    }
    result.push(item);
  }
  return result;
}

export function convertMessagesForDashboard(input: {
  messages: MessageResponse[];
  deadlineResult: DeadlineResult | null;
  agentId?: AgentId;
  sessionStatus?: BrowserUseSessionStatus | null;
}): DashboardConversionResult {
  return {
    activityFeed: convertMessagesToActivityFeed(input.messages, {
      agentId: input.agentId,
      sessionStatus: input.sessionStatus,
    }),
    deadlineResult: input.deadlineResult,
  };
}

function messageToFeedItems(
  message: MessageResponse,
  base: FeedBase,
  toolLabelStatus: ToolStatus,
): ActivityFeedItem[] {
  const raw = message.data?.trim() ?? "";
  if (!raw) return [];

  const parsed = tryParseJson(raw);
  if (parsed === null) {
    const line = shorten(raw.replace(/\s+/g, " "));
    if (isActivityFeedNoiseText(line)) return [];
    return [
      {
        id: message.id,
        ...base,
        feedKind: "text",
        message: line,
      },
    ];
  }

  if (typeof parsed === "string") {
    const line = shorten(parsed);
    if (isActivityFeedNoiseText(line)) return [];
    return [{ id: message.id, ...base, feedKind: "text", message: line }];
  }

  if (Array.isArray(parsed)) {
    const fromArr = itemsFromContentArray(parsed, message.id, base);
    if (fromArr.length > 0) return fromArr;
    return [
      {
        id: `${message.id}-fb`,
        ...base,
        feedKind: "fallback",
        label: "Assistant update",
        rawSnippet: shorten(JSON.stringify(parsed), 500),
      },
    ];
  }

  if (typeof parsed === "object") {
    return itemsFromParsedObject(parsed as Record<string, unknown>, message, base, toolLabelStatus);
  }

  return [
    {
      id: message.id,
      ...base,
      feedKind: "fallback",
      label: "Update",
      rawSnippet: shorten(String(parsed), 400),
    },
  ];
}

function hasToolCallsArray(obj: Record<string, unknown>): boolean {
  return Array.isArray(obj.tool_calls) && obj.tool_calls.length > 0;
}

function allToolCallsOmitted(obj: Record<string, unknown>): boolean {
  const tc = obj.tool_calls;
  if (!Array.isArray(tc) || tc.length === 0) return false;
  return tc.every((c) => shouldOmitToolCall(extractToolName(c)));
}

function isResultsOnlyPayload(obj: Record<string, unknown>): boolean {
  return obj.success === true && Array.isArray(obj.results);
}

/** Every content part is scrape/CSS/dict noise — nothing to show. */
function contentArrayAllNoise(content: unknown): boolean {
  if (!Array.isArray(content) || content.length === 0) return false;
  let sawTextOrThinking = false;
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const p = part as Record<string, unknown>;
    if (typeof p.thinking === "string" && p.thinking.trim()) {
      sawTextOrThinking = true;
      if (!isActivityFeedNoiseText(p.thinking.trim())) return false;
    }
    if (typeof p.text === "string" && p.text.trim()) {
      sawTextOrThinking = true;
      if (!isActivityFeedNoiseText(p.text.trim())) return false;
    }
  }
  return sawTextOrThinking;
}

/** When we produced no rows: skip JSON blobs for search results, browser-only steps, or all-noise content. */
function shouldEmitNothingForEmptyItems(obj: Record<string, unknown>): boolean {
  if (hasToolCallsArray(obj) && allToolCallsOmitted(obj)) {
    return true;
  }

  if (isResultsOnlyPayload(obj)) {
    return true;
  }

  if (contentArrayAllNoise(obj.content)) {
    return true;
  }

  return false;
}

function itemsFromParsedObject(
  obj: Record<string, unknown>,
  message: MessageResponse,
  base: FeedBase,
  toolLabelStatus: ToolStatus,
): ActivityFeedItem[] {
  const idBase = message.id;

  if (typeof obj.data === "string" && obj.data.trim().startsWith("{")) {
    const inner = tryParseJson(obj.data);
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return itemsFromParsedObject(inner as Record<string, unknown>, message, base, toolLabelStatus);
    }
  }

  const items: ActivityFeedItem[] = [];

  const content = obj.content;
  if (Array.isArray(content)) {
    items.push(...itemsFromContentArray(content, idBase, base));
  }

  const toolCalls = obj.tool_calls;
  if (Array.isArray(toolCalls)) {
    toolCalls.forEach((tc, i) => {
      const toolName = extractToolName(tc);
      if (!toolName || shouldOmitToolCall(toolName)) return;
      const args = extractToolArgs(tc);
      items.push({
        ...base,
        id: `${idBase}-tc-${i}`,
        feedKind: "tool_call",
        toolName,
        displayName: getToolLabel(toolName, toolLabelStatus),
        displayValue: getToolDisplayValue(toolName, args),
      });
    });
  }

  if (items.length > 0) return items;

  if (shouldEmitNothingForEmptyItems(obj)) {
    return [];
  }

  const simple = extractTextFromObject(obj);
  if (simple) {
    const line = shorten(simple);
    if (isActivityFeedNoiseText(line)) return [];
    return [{ id: idBase, ...base, feedKind: "text", message: line }];
  }

  if (isResultsOnlyPayload(obj)) {
    return [];
  }

  return [
    {
      id: `${idBase}-fb`,
      ...base,
      feedKind: "fallback",
      label: "Assistant update",
      rawSnippet: shorten(JSON.stringify(obj), 500),
    },
  ];
}

function itemsFromContentArray(
  content: unknown[],
  idBase: string,
  base: FeedBase,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];
  for (let i = 0; i < content.length; i++) {
    const part = content[i];
    if (!part || typeof part !== "object") continue;
    const p = part as Record<string, unknown>;

    if (typeof p.thinking === "string" && p.thinking.trim()) {
      const full = p.thinking.trim();
      if (!isActivityFeedNoiseText(full)) {
        items.push({
          ...base,
          id: `${idBase}-th-${i}`,
          feedKind: "thinking",
          fullText: full,
        });
      }
    }

    const text =
      typeof p.text === "string" && p.text.trim() ? p.text.trim() : null;

    if (text) {
      const line = shorten(text);
      if (!isActivityFeedNoiseText(line)) {
        items.push({
          ...base,
          id: `${idBase}-tx-${i}`,
          feedKind: "text",
          message: line,
        });
      }
    }
  }
  return items;
}

function extractToolName(tc: unknown): string {
  if (!tc || typeof tc !== "object") return "";
  const o = tc as Record<string, unknown>;
  const fn = o.function;
  if (fn && typeof fn === "object") {
    const name = (fn as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return typeof o.name === "string" ? o.name : "";
}

function extractToolArgs(tc: unknown): Record<string, unknown> | undefined {
  if (!tc || typeof tc !== "object") return undefined;
  const o = tc as Record<string, unknown>;
  const fn = o.function;
  if (fn && typeof fn === "object") {
    const args = (fn as Record<string, unknown>).arguments;
    if (typeof args === "string" && args.trim()) {
      const parsed = tryParseJson(args);
      if (parsed && typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    }
  }
  return undefined;
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

function shorten(text: string, max = 220): string {
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}
