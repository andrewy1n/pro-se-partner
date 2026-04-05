import { BrowserUse } from "browser-use-sdk/v3";
import type {
  CreateSessionBody,
  MessageResponse,
  SessionMessagesParams,
  SessionResponse,
} from "browser-use-sdk/v3";
import type { AgentId } from "@/lib/types";
import {
  acquireBrowserSessionSlot,
  finalizeBrowserSessionSlotIfTerminal,
  getTrackedBrowserSessionSlotIds,
  registerBrowserSessionSlot,
  releaseBrowserSessionSlotIfFailed,
  waitQueueLengthForSlots,
} from "@/lib/browser-session-slots";
import {
  isVerboseSessionPoll,
  logServerError,
  logServerEvent,
} from "@/lib/server-log";

export type BrowserUseModelId = "bu-mini" | "bu-max";

export const DEFAULT_BROWSER_USE_MODEL: BrowserUseModelId = "bu-max";

// Server-only — no NEXT_PUBLIC_ prefix, never exposed to the browser
const apiKey = process.env.BROWSER_USE_API_KEY ?? "";
const client = new BrowserUse({ apiKey });

export { client };

export function getBrowserUseModel(): BrowserUseModelId {
  const raw = process.env.BROWSER_USE_MODEL?.trim().toLowerCase();
  if (raw === "bu-mini" || raw === "bu-max") return raw;
  return DEFAULT_BROWSER_USE_MODEL;
}

export interface CreateSessionInput {
  model?: BrowserUseModelId;
  keepAlive?: boolean;
  outputSchema?: Record<string, unknown>;
}

export interface SendAgentTaskInput {
  sessionId: string;
  agentId: AgentId;
  task: string;
  model?: BrowserUseModelId;
  keepAlive?: boolean;
  outputSchema?: Record<string, unknown>;
}

export interface CreateBrowserTaskSessionInput {
  agentId: AgentId;
  task: string;
  model?: BrowserUseModelId;
  keepAlive?: boolean;
  outputSchema?: Record<string, unknown>;
}

export async function createBrowserSession(
  input: CreateSessionInput,
): Promise<SessionResponse> {
  assertBrowserUseConfigured();

  const body = {
    model: input.model ?? getBrowserUseModel(),
    keepAlive: input.keepAlive ?? false,
    ...(input.outputSchema ? { outputSchema: input.outputSchema } : {}),
    browserScreenWidth: 1280,
    browserScreenHeight: 720,
  } as CreateSessionBody;

  logServerEvent("browser_use_create_session_start", {
    model: body.model,
    keepAlive: body.keepAlive,
    hasOutputSchema: Boolean(input.outputSchema),
  });

  try {
    const session = await client.sessions.create(body);
    logServerEvent("browser_use_create_session_ok", {
      sessionId: session.id,
      status: session.status,
      hasLiveUrl: Boolean(session.liveUrl),
    });
    return session;
  } catch (err) {
    logServerError("browser_use_create_session_failed", err, {
      model: body.model,
    });
    throw err;
  }
}

export async function sendAgentTask(input: SendAgentTaskInput): Promise<SessionResponse> {
  assertBrowserUseConfigured();

  logServerEvent("browser_use_send_task_start", {
    sessionId: input.sessionId,
    agentId: input.agentId,
    model: input.model ?? getBrowserUseModel(),
    taskChars: input.task.length,
    hasOutputSchema: Boolean(input.outputSchema),
  });

  try {
    const session = await client.sessions.create({
      sessionId: input.sessionId,
      task: input.task,
      model: input.model ?? getBrowserUseModel(),
      keepAlive: input.keepAlive ?? false,
      outputSchema: input.outputSchema,
    });
    logServerEvent("browser_use_send_task_ok", {
      sessionId: session.id,
      status: session.status,
      hasLiveUrl: Boolean(session.liveUrl),
    });
    return session;
  } catch (err) {
    logServerError("browser_use_send_task_failed", err, {
      sessionId: input.sessionId,
      agentId: input.agentId,
    });
    throw err;
  }
}

export async function createBrowserTaskSession(
  input: CreateBrowserTaskSessionInput,
): Promise<SessionResponse> {
  assertBrowserUseConfigured();
  ensureBrowserSessionSlotReleasePoller();

  const keepAlive = input.keepAlive ?? false;

  await acquireBrowserSessionSlot();

  logServerEvent("browser_use_run_task_start", {
    agentId: input.agentId,
    model: input.model ?? getBrowserUseModel(),
    taskChars: input.task.length,
    keepAlive,
    hasOutputSchema: Boolean(input.outputSchema),
  });

  try {
    const session = await client.sessions.create({
      task: input.task,
      model: input.model ?? getBrowserUseModel(),
      keepAlive,
      outputSchema: input.outputSchema,
      browserScreenWidth: 1280,
      browserScreenHeight: 720,
    } as CreateSessionBody);
    registerBrowserSessionSlot(session.id);
    logServerEvent("browser_use_run_task_ok", {
      sessionId: session.id,
      agentId: input.agentId,
      status: session.status,
      hasLiveUrl: Boolean(session.liveUrl),
    });
    return session;
  } catch (err) {
    releaseBrowserSessionSlotIfFailed();
    logServerError("browser_use_run_task_failed", err, {
      agentId: input.agentId,
    });
    throw err;
  }
}

export async function getBrowserSession(sessionId: string): Promise<SessionResponse> {
  assertBrowserUseConfigured();
  try {
    const session = await client.sessions.get(sessionId);
    finalizeBrowserSessionSlotIfTerminal(sessionId, session.status);
    if (isVerboseSessionPoll()) {
      logServerEvent("browser_use_get_session_ok", {
        sessionId,
        status: session.status,
        hasOutput: session.output != null,
      });
    }
    return session;
  } catch (err) {
    logServerError("browser_use_get_session_failed", err, { sessionId });
    throw err;
  }
}

let slotReleasePollInterval: ReturnType<typeof setInterval> | null = null;

/** Frequent enough to unblock the slot queue soon after agents 1–3 finish (vs 2s). */
const SLOT_RELEASE_POLL_MS = 600;

/**
 * Polls Browser Use for tracked sessions so slots release on terminal even before
 * the client receives session ids (e.g. fourth Wave 1 agent waiting on acquire).
 */
function ensureBrowserSessionSlotReleasePoller(): void {
  if (slotReleasePollInterval != null) return;
  if (typeof setInterval === "undefined") return;
  slotReleasePollInterval = setInterval(() => {
    void tickBrowserSessionSlotReleases();
  }, SLOT_RELEASE_POLL_MS);
}

async function tickBrowserSessionSlotReleases(): Promise<void> {
  if (!apiKey.trim()) return;
  const ids = getTrackedBrowserSessionSlotIds();
  const waiting = waitQueueLengthForSlots();
  if (ids.length === 0 && waiting === 0) return;

  for (const sessionId of ids) {
    try {
      await getBrowserSession(sessionId);
    } catch {
      /* session may be expired or invalid */
    }
  }
}

export async function listSessionMessages(
  sessionId: string,
  params?: SessionMessagesParams,
): Promise<MessageResponse[]> {
  assertBrowserUseConfigured();
  const normalizedParams = {
    limit: Math.min(params?.limit ?? 100, 100),
    ...(params?.after ? { after: params.after } : {}),
    ...(params?.before ? { before: params.before } : {}),
  } satisfies SessionMessagesParams;

  try {
    const { messages } = await client.sessions.messages(sessionId, normalizedParams);
    if (isVerboseSessionPoll()) {
      logServerEvent("browser_use_list_messages_ok", {
        sessionId,
        messageCount: messages.length,
        hasAfter: Boolean(normalizedParams.after),
      });
    }
    return messages;
  } catch (err) {
    const debugErr = err as {
      status?: number;
      statusCode?: number;
      code?: string;
      detail?: unknown;
      cause?: unknown;
      details?: unknown;
      response?: { status?: number; data?: unknown };
    };
    const detailPreview =
      debugErr.detail == null
        ? null
        : typeof debugErr.detail === "string"
          ? debugErr.detail
          : JSON.stringify(debugErr.detail).slice(0, 500);
    logServerError("browser_use_list_messages_failed", err, { sessionId });
    throw err;
  }
}

export async function stopBrowserSession(sessionId: string): Promise<SessionResponse> {
  assertBrowserUseConfigured();
  try {
    const session = await client.sessions.stop(sessionId, { strategy: "session" });
    finalizeBrowserSessionSlotIfTerminal(sessionId, session.status);
    logServerEvent("browser_use_stop_session_ok", { sessionId, status: session.status });
    return session;
  } catch (err) {
    logServerError("browser_use_stop_session_failed", err, { sessionId });
    throw err;
  }
}

function assertBrowserUseConfigured() {
  if (!apiKey.trim()) {
    throw new Error(
      "Server is not configured for Browser Use. Set BROWSER_USE_API_KEY.",
    );
  }
}
