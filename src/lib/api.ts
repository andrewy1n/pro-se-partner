import { BrowserUse as BrowserUseV3 } from "browser-use-sdk/v3";
import { BrowserUse as BrowserUseV2 } from "browser-use-sdk";
import type { MessageResponse, SessionResponse } from "browser-use-sdk/v3";
import type { AgentId } from "@/lib/types";

// Server-only — no NEXT_PUBLIC_ prefix, never exposed to the browser
const apiKey = process.env.BROWSER_USE_API_KEY ?? "";
const v3 = new BrowserUseV3({ apiKey });
const v2 = new BrowserUseV2({ apiKey });

export const client = v3;
export const clientV2 = v2;

export interface CreateSessionInput {
  // TODO: Add model/profile/workspace settings from intake flow.
  model?: string;
}

export interface SendAgentTaskInput {
  sessionId: string;
  agentId: AgentId;
  task: string;
}

export async function createBrowserSession(
  _input: CreateSessionInput,
): Promise<SessionResponse> {
  // TODO: Wrap Browser Use session create lifecycle for Pro Se Partner.
  throw new Error("Not implemented: createBrowserSession");
}

export async function sendAgentTask(_input: SendAgentTaskInput): Promise<void> {
  // TODO: Dispatch agent-scoped tasks to Browser Use sessions.
  throw new Error("Not implemented: sendAgentTask");
}

export async function listSessionMessages(_sessionId: string): Promise<MessageResponse[]> {
  // TODO: Poll session messages at 1s intervals from session-context.
  throw new Error("Not implemented: listSessionMessages");
}

export async function stopBrowserSession(_sessionId: string): Promise<void> {
  // TODO: Support explicit stop/retry controls for long-running agents.
  throw new Error("Not implemented: stopBrowserSession");
}
