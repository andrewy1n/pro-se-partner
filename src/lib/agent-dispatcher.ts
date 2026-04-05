import type {
  CanonicalCaseContext,
  DeadlineTrackerSession,
  DefenseResearchSession,
  FeeWaiverResult,
  HitlGateState,
  LegalAidSession,
  Wave1AgentKey,
} from "@/lib/types";
import { createBrowserSession, sendAgentTask } from "@/lib/api";
import {
  buildDeadlineTrackerTask,
  DEADLINE_RESULT_OUTPUT_SCHEMA,
} from "@/lib/deadline-tracker";
import {
  buildDefenseResearchTask,
  DEFENSE_RESULT_OUTPUT_SCHEMA,
} from "@/lib/defense-research";
import {
  buildLegalAidTask,
  LEGAL_AID_RESULT_OUTPUT_SCHEMA,
} from "@/lib/legal-aid";
import { logServerError, logServerEvent } from "@/lib/server-log";

export interface DispatchWave1Input {
  appSessionId: string;
  caseContext: CanonicalCaseContext;
  /** Which Wave 1 agents to launch; callers pass a non-empty subset. */
  agents: readonly Wave1AgentKey[];
}

export interface DispatchWave2Input {
  sessionId: string;
  efilingUsername: string;
}

export interface DispatchWave1Result {
  deadlineTrackerSession: DeadlineTrackerSession | null;
  defenseResearchSession: DefenseResearchSession | null;
  legalAidSession: LegalAidSession | null;
}

async function launchDeadlineTrackerSession(
  appSessionId: string,
  caseContext: CanonicalCaseContext,
): Promise<DeadlineTrackerSession> {
  const session = await createBrowserSession({
    keepAlive: true,
    outputSchema: DEADLINE_RESULT_OUTPUT_SCHEMA,
  });

  await sendAgentTask({
    sessionId: session.id,
    agentId: "agent-4-deadline-procedure",
    outputSchema: DEADLINE_RESULT_OUTPUT_SCHEMA,
    task: `${buildDeadlineTrackerTask({ caseContext })}\n\nInternal tracking id: ${appSessionId}`,
  });

  return {
    sessionId: session.id,
    liveUrl: session.liveUrl ?? null,
    status: session.status,
    activeAgentId: "agent-4-deadline-procedure",
  };
}

async function launchDefenseResearchSession(
  appSessionId: string,
  caseContext: CanonicalCaseContext,
): Promise<DefenseResearchSession> {
  const session = await createBrowserSession({
    keepAlive: true,
    outputSchema: DEFENSE_RESULT_OUTPUT_SCHEMA,
  });

  await sendAgentTask({
    sessionId: session.id,
    agentId: "agent-5-defense-research",
    outputSchema: DEFENSE_RESULT_OUTPUT_SCHEMA,
    task: `${buildDefenseResearchTask({ caseContext })}\n\nInternal tracking id: ${appSessionId}`,
  });

  return {
    sessionId: session.id,
    liveUrl: session.liveUrl ?? null,
    status: session.status,
    activeAgentId: "agent-5-defense-research",
  };
}

async function launchLegalAidSession(
  appSessionId: string,
  caseContext: CanonicalCaseContext,
): Promise<LegalAidSession> {
  const session = await createBrowserSession({
    keepAlive: true,
    outputSchema: LEGAL_AID_RESULT_OUTPUT_SCHEMA,
  });

  await sendAgentTask({
    sessionId: session.id,
    agentId: "agent-6-legal-aid",
    outputSchema: LEGAL_AID_RESULT_OUTPUT_SCHEMA,
    task: `${buildLegalAidTask({ caseContext })}\n\nInternal tracking id: ${appSessionId}`,
  });

  return {
    sessionId: session.id,
    liveUrl: session.liveUrl ?? null,
    status: session.status,
    activeAgentId: "agent-6-legal-aid",
  };
}

const AGENT_ID_BY_WAVE1_KEY: Record<
  Wave1AgentKey,
  "agent-4-deadline-procedure" | "agent-5-defense-research" | "agent-6-legal-aid"
> = {
  deadline: "agent-4-deadline-procedure",
  defense: "agent-5-defense-research",
  legalAid: "agent-6-legal-aid",
};

export async function dispatchWave1Agents(
  input: DispatchWave1Input,
): Promise<DispatchWave1Result> {
  const { agents } = input;
  const agentIds = agents.map((k) => AGENT_ID_BY_WAVE1_KEY[k]);

  logServerEvent("dispatch_wave1_start", {
    appSessionId: input.appSessionId,
    agents: agentIds,
  });

  type Entry =
    | { key: "deadline"; promise: Promise<DeadlineTrackerSession> }
    | { key: "defense"; promise: Promise<DefenseResearchSession> }
    | { key: "legalAid"; promise: Promise<LegalAidSession> };

  const entries: Entry[] = [];

  for (const key of agents) {
    if (key === "deadline") {
      entries.push({
        key: "deadline",
        promise: launchDeadlineTrackerSession(input.appSessionId, input.caseContext),
      });
    } else if (key === "defense") {
      entries.push({
        key: "defense",
        promise: launchDefenseResearchSession(input.appSessionId, input.caseContext),
      });
    } else {
      entries.push({
        key: "legalAid",
        promise: launchLegalAidSession(input.appSessionId, input.caseContext),
      });
    }
  }

  const settled = await Promise.allSettled(entries.map((e) => e.promise));

  const result: DispatchWave1Result = {
    deadlineTrackerSession: null,
    defenseResearchSession: null,
    legalAidSession: null,
  };

  for (let i = 0; i < settled.length; i++) {
    const key = entries[i].key;
    const s = settled[i];

    if (s.status === "fulfilled") {
      if (key === "deadline") {
        const value = s.value as DeadlineTrackerSession;
        logServerEvent("dispatch_wave1_deadline_tracker_ok", {
          appSessionId: input.appSessionId,
          browserSessionId: value.sessionId,
          status: value.status,
        });
        result.deadlineTrackerSession = value;
      } else if (key === "defense") {
        const value = s.value as DefenseResearchSession;
        logServerEvent("dispatch_wave1_defense_research_ok", {
          appSessionId: input.appSessionId,
          browserSessionId: value.sessionId,
          status: value.status,
        });
        result.defenseResearchSession = value;
      } else {
        const value = s.value as LegalAidSession;
        logServerEvent("dispatch_wave1_legal_aid_ok", {
          appSessionId: input.appSessionId,
          browserSessionId: value.sessionId,
          status: value.status,
        });
        result.legalAidSession = value;
      }
    } else {
      if (key === "deadline") {
        logServerError("dispatch_wave1_deadline_tracker_failed", s.reason, {
          appSessionId: input.appSessionId,
        });
      } else if (key === "defense") {
        logServerError("dispatch_wave1_defense_research_failed", s.reason, {
          appSessionId: input.appSessionId,
        });
      } else {
        logServerError("dispatch_wave1_legal_aid_failed", s.reason, {
          appSessionId: input.appSessionId,
        });
      }
    }
  }

  return result;
}

export async function dispatchWave2Agent(_input: DispatchWave2Input): Promise<void> {
  // TODO: Resume from HITL gate and launch Agent 9 e-filing flow.
  throw new Error("Not implemented: dispatchWave2Agent");
}

export function deriveHitlGateState(): HitlGateState {
  // TODO: Replace action items content while waiting for required user action.
  return {
    isBlockedOnUser: false,
    instruction: null,
  };
}

export function mergeFeeWaiverForPdfFiller(
  _result: FeeWaiverResult,
): FeeWaiverResult {
  // TODO: Pass Agent 7 eligibility output into Agent 3b payload.
  return _result;
}
