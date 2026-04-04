import type {
  CanonicalCaseContext,
  DeadlineTrackerSession,
  DefenseResearchSession,
  FeeWaiverResult,
  HitlGateState,
  LegalAidSession,
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

export async function dispatchWave1Agents(
  input: DispatchWave1Input,
): Promise<DispatchWave1Result> {
  logServerEvent("dispatch_wave1_start", {
    appSessionId: input.appSessionId,
    agents: ["agent-4-deadline-procedure", "agent-5-defense-research", "agent-6-legal-aid"],
  });

  const [deadlineSettled, defenseSettled, legalAidSettled] = await Promise.allSettled([
    launchDeadlineTrackerSession(input.appSessionId, input.caseContext),
    launchDefenseResearchSession(input.appSessionId, input.caseContext),
    launchLegalAidSession(input.appSessionId, input.caseContext),
  ]);

  if (deadlineSettled.status === "fulfilled") {
    logServerEvent("dispatch_wave1_deadline_tracker_ok", {
      appSessionId: input.appSessionId,
      browserSessionId: deadlineSettled.value.sessionId,
      status: deadlineSettled.value.status,
    });
  } else {
    logServerError("dispatch_wave1_deadline_tracker_failed", deadlineSettled.reason, {
      appSessionId: input.appSessionId,
    });
  }

  if (defenseSettled.status === "fulfilled") {
    logServerEvent("dispatch_wave1_defense_research_ok", {
      appSessionId: input.appSessionId,
      browserSessionId: defenseSettled.value.sessionId,
      status: defenseSettled.value.status,
    });
  } else {
    logServerError("dispatch_wave1_defense_research_failed", defenseSettled.reason, {
      appSessionId: input.appSessionId,
    });
  }

  if (legalAidSettled.status === "fulfilled") {
    logServerEvent("dispatch_wave1_legal_aid_ok", {
      appSessionId: input.appSessionId,
      browserSessionId: legalAidSettled.value.sessionId,
      status: legalAidSettled.value.status,
    });
  } else {
    logServerError("dispatch_wave1_legal_aid_failed", legalAidSettled.reason, {
      appSessionId: input.appSessionId,
    });
  }

  return {
    deadlineTrackerSession:
      deadlineSettled.status === "fulfilled" ? deadlineSettled.value : null,
    defenseResearchSession:
      defenseSettled.status === "fulfilled" ? defenseSettled.value : null,
    legalAidSession:
      legalAidSettled.status === "fulfilled" ? legalAidSettled.value : null,
  };
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
