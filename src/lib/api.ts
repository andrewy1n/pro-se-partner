import { BrowserUse } from "browser-use-sdk/v3";
import type {
  CreateSessionBody,
  MessageResponse,
  SessionResponse,
} from "browser-use-sdk/v3";
import type { AgentId } from "@/lib/types";
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
  outputSchema?: Record<string, unknown>;
}

export async function createBrowserSession(
  input: CreateSessionInput,
): Promise<SessionResponse> {
  assertBrowserUseConfigured();

  const body: CreateSessionBody = {
    model: input.model ?? getBrowserUseModel(),
    keepAlive: input.keepAlive ?? true,
  };

  if (input.outputSchema) {
    body.outputSchema = input.outputSchema;
  }

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
      keepAlive: true,
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

export async function getBrowserSession(sessionId: string): Promise<SessionResponse> {
  assertBrowserUseConfigured();
  try {
    const session = await client.sessions.get(sessionId);
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

export async function listSessionMessages(sessionId: string): Promise<MessageResponse[]> {
  assertBrowserUseConfigured();

  try {
    // Browser Use API validates limit <= 100 (HTTP 422 if higher).
    const { messages } = await client.sessions.messages(sessionId, {
      limit: 100,
    });
    if (isVerboseSessionPoll()) {
      logServerEvent("browser_use_list_messages_ok", {
        sessionId,
        messageCount: messages.length,
      });
    }
    return messages;
  } catch (err) {
    logServerError("browser_use_list_messages_failed", err, { sessionId });
    throw err;
  }
}

export async function stopBrowserSession(sessionId: string): Promise<SessionResponse> {
  assertBrowserUseConfigured();
  try {
    const session = await client.sessions.stop(sessionId, { strategy: "session" });
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
