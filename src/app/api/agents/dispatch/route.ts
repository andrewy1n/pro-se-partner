import { NextResponse } from "next/server";
import { dispatchWave1Agents } from "@/lib/agent-dispatcher";
import { logServerError, logServerEvent } from "@/lib/server-log";
import type {
  CanonicalCaseContext,
  DispatchWave1Response,
  Wave1AgentKey,
} from "@/lib/types";
import { WAVE1_AGENT_KEYS_ALL } from "@/lib/types";

export const runtime = "nodejs";

function parseWave1AgentsField(raw: unknown): Wave1AgentKey[] | null {
  if (raw === undefined) {
    return [...WAVE1_AGENT_KEYS_ALL];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const seen = new Set<Wave1AgentKey>();
  for (const x of raw) {
    if (x === "deadline" || x === "defense" || x === "legalAid") {
      seen.add(x);
    } else {
      return null;
    }
  }
  if (seen.size === 0) {
    return null;
  }
  return WAVE1_AGENT_KEYS_ALL.filter((k) => seen.has(k));
}

export async function POST(request: Request) {
  if (!process.env.BROWSER_USE_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured for Browser Use. Set BROWSER_USE_API_KEY (see .env.local).",
      },
      { status: 503 },
    );
  }

  let body: { sessionId?: unknown; caseContext?: unknown; agents?: unknown };
  try {
    body = (await request.json()) as {
      sessionId?: unknown;
      caseContext?: unknown;
      agents?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const { sessionId, caseContext, agents: agentsRaw } = body;

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: 'Expected field "sessionId" (string)' }, { status: 400 });
  }
  if (!caseContext || typeof caseContext !== "object") {
    return NextResponse.json({ error: 'Expected field "caseContext" (object)' }, { status: 400 });
  }

  const agents = parseWave1AgentsField(agentsRaw);
  if (agents === null) {
    return NextResponse.json(
      {
        error:
          'Optional field "agents" must be a non-empty array of "deadline", "defense", and/or "legalAid".',
      },
      { status: 400 },
    );
  }

  try {
    const wave1 = await dispatchWave1Agents({
      appSessionId: sessionId,
      caseContext: caseContext as CanonicalCaseContext,
      agents,
    });

    logServerEvent("agents_dispatch_wave1", {
      sessionId,
      deadlineSessionId: wave1.deadlineTrackerSession?.sessionId ?? "none",
      defenseSessionId: wave1.defenseResearchSession?.sessionId ?? "none",
      legalAidSessionId: wave1.legalAidSession?.sessionId ?? "none",
    });

    const response: DispatchWave1Response = {
      deadlineTrackerSession: wave1.deadlineTrackerSession,
      defenseResearchSession: wave1.defenseResearchSession,
      legalAidSession: wave1.legalAidSession,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent dispatch failed";
    logServerError("agents_dispatch_error", err, { sessionId });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
