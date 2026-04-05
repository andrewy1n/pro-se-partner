import { NextResponse } from "next/server";
import { getBrowserSession } from "@/lib/api";
import { parseFormsNavigatorResult } from "@/lib/forms-navigator";
import { parseDeadlineResult } from "@/lib/deadline-tracker";
import { parseDefenseResult } from "@/lib/defense-research";
import { parseLegalAidResult } from "@/lib/legal-aid";
import { parseEfilingResult } from "@/lib/efiling";
import {
  isVerboseSessionPoll,
  logServerError,
  logServerEvent,
} from "@/lib/server-log";
import type { AgentId, EfilingResult, SessionPollResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const browserSessionId = searchParams.get("browserSessionId")?.trim();
  const agentId = (searchParams.get("agentId")?.trim() ?? "agent-4-deadline-procedure") as AgentId;

  if (!id) {
    return NextResponse.json({ error: "Missing app session id" }, { status: 400 });
  }

  if (!browserSessionId) {
    return NextResponse.json(
      { error: "Missing browserSessionId query parameter" },
      { status: 400 },
    );
  }

  try {
    const session = await getBrowserSession(browserSessionId);
    let formsNavigatorResult = null;
    let deadlineResult = null;
    let defenseResult = null;
    let legalAidResult = null;
    let efilingResult: EfilingResult | null = null;

    if (agentId === "agent-3-forms-navigator") {
      formsNavigatorResult = parseFormsNavigatorResult(session.output);
      if (session.output != null && formsNavigatorResult == null) {
        logServerEvent("session_poll_forms_parse_mismatch", {
          appSessionId: id,
          browserSessionId,
          outputPreview:
            typeof session.output === "string"
              ? session.output.slice(0, 400)
              : JSON.stringify(session.output).slice(0, 400),
        });
      }
    } else if (agentId === "agent-5-defense-research") {
      defenseResult = parseDefenseResult(session.output);
      if (session.output != null && defenseResult == null) {
        logServerEvent("session_poll_defense_parse_mismatch", {
          appSessionId: id,
          browserSessionId,
          outputPreview:
            typeof session.output === "string"
              ? session.output.slice(0, 400)
              : JSON.stringify(session.output).slice(0, 400),
        });
      }
    } else if (agentId === "agent-6-legal-aid") {
      legalAidResult = parseLegalAidResult(session.output);
      if (session.output != null && legalAidResult == null) {
        logServerEvent("session_poll_legal_aid_parse_mismatch", {
          appSessionId: id,
          browserSessionId,
          outputPreview:
            typeof session.output === "string"
              ? session.output.slice(0, 400)
              : JSON.stringify(session.output).slice(0, 400),
        });
      }
    } else if (agentId === "agent-9-efiling") {
      efilingResult = parseEfilingResult(session.output);
      if (session.output != null && efilingResult == null) {
        logServerEvent("session_poll_efiling_parse_mismatch", {
          appSessionId: id,
          browserSessionId,
          outputPreview:
            typeof session.output === "string"
              ? session.output.slice(0, 400)
              : JSON.stringify(session.output).slice(0, 400),
        });
      }
    } else {
      deadlineResult = parseDeadlineResult(session.output);
      if (session.output != null && deadlineResult == null) {
        logServerEvent("session_poll_deadline_parse_mismatch", {
          appSessionId: id,
          browserSessionId,
          outputPreview:
            typeof session.output === "string"
              ? session.output.slice(0, 400)
              : JSON.stringify(session.output).slice(0, 400),
        });
      }
    }

    if (isVerboseSessionPoll()) {
      logServerEvent("session_poll_ok", {
        appSessionId: id,
        browserSessionId,
        agentId,
        sessionStatus: session.status,
        hasFormsNavigatorResult: Boolean(formsNavigatorResult),
        hasDeadlineResult: Boolean(deadlineResult),
        hasDefenseResult: Boolean(defenseResult),
        hasLegalAidResult: Boolean(legalAidResult),
        hasEfilingResult: Boolean(efilingResult),
      });
    }

    const response: SessionPollResponse = {
      activeSession: {
        sessionId: session.id,
        liveUrl: session.liveUrl ?? null,
        activeAgentId: agentId,
        activeWave: agentId === "agent-9-efiling" ? "wave-2" : "wave-1",
        stage: agentId === "agent-9-efiling" ? "stage-2-filing" : "stage-1-intake",
        status: session.status,
      },
      formsNavigatorResult,
      deadlineResult,
      defenseResult,
      legalAidResult,
      efilingResult,
      messages: [],
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to poll session";
    logServerError("session_poll_failed", err, {
      appSessionId: id,
      browserSessionId,
      agentId,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
