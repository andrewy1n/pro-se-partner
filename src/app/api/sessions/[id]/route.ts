import { NextResponse } from "next/server";
import { getBrowserSession, listSessionMessages } from "@/lib/api";
import { parseDeadlineResult } from "@/lib/deadline-tracker";
import {
  isVerboseSessionPoll,
  logServerError,
  logServerEvent,
} from "@/lib/server-log";
import type { SessionPollResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const browserSessionId = searchParams.get("browserSessionId")?.trim();

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
    let messages: Awaited<ReturnType<typeof listSessionMessages>> = [];
    try {
      messages = await listSessionMessages(browserSessionId);
    } catch (messagesErr) {
      logServerError("session_poll_messages_non_fatal", messagesErr, {
        appSessionId: id,
        browserSessionId,
      });
    }

    const deadlineResult = parseDeadlineResult(session.output);
    if (session.output != null && deadlineResult == null) {
      logServerEvent("session_poll_deadline_parse_mismatch", {
        appSessionId: id,
        browserSessionId,
        outputType: typeof session.output,
        outputPreview:
          typeof session.output === "string"
            ? session.output.slice(0, 400)
            : JSON.stringify(session.output).slice(0, 400),
      });
    }

    if (isVerboseSessionPoll()) {
      logServerEvent("session_poll_ok", {
        appSessionId: id,
        browserSessionId,
        sessionStatus: session.status,
        messageCount: messages.length,
        hasDeadlineResult: Boolean(deadlineResult),
      });
    }

    const response: SessionPollResponse = {
      activeSession: {
        sessionId: session.id,
        liveUrl: session.liveUrl ?? null,
        activeAgentId: "agent-4-deadline-procedure",
        activeWave: "wave-1",
        stage: "stage-1-intake",
        status: session.status,
      },
      deadlineResult,
      messages,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to poll session";
    logServerError("session_poll_failed", err, {
      appSessionId: id,
      browserSessionId,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
