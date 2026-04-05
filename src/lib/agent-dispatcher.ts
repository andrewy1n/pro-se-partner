import type {
  CanonicalCaseContext,
  EfilingSession,
  FormsNavigatorSession,
  DeadlineTrackerSession,
  DefenseResearchSession,
  FeeWaiverResult,
  HitlGateState,
  LegalAidSession,
  Wave1AgentKey,
} from "@/lib/types";
import { createBrowserTaskSession } from "@/lib/api";
import {
  buildFormsNavigatorTask,
  FORMS_NAVIGATOR_OUTPUT_SCHEMA,
} from "@/lib/forms-navigator";
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
import {
  buildEfilingTask,
  EFILING_OUTPUT_SCHEMA,
} from "@/lib/efiling";
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
  filledPdfUrl: string | null;
  caseContext: CanonicalCaseContext;
}

export interface DispatchWave2Result {
  efilingSession: EfilingSession;
}

export interface DispatchWave1Result {
  formsNavigatorSession: FormsNavigatorSession | null;
  deadlineTrackerSession: DeadlineTrackerSession | null;
  defenseResearchSession: DefenseResearchSession | null;
  legalAidSession: LegalAidSession | null;
}

async function launchFormsNavigatorSession(
  appSessionId: string,
  caseContext: CanonicalCaseContext,
): Promise<FormsNavigatorSession> {
  const session = await createBrowserTaskSession({
    agentId: "agent-3-forms-navigator",
    keepAlive: true,
    outputSchema: FORMS_NAVIGATOR_OUTPUT_SCHEMA,
    task: buildFormsNavigatorTask({ appSessionId, caseContext }),
  });

  return {
    sessionId: session.id,
    liveUrl: session.liveUrl ?? null,
    status: session.status,
    activeAgentId: "agent-3-forms-navigator",
  };
}

async function launchDeadlineTrackerSession(
  appSessionId: string,
  caseContext: CanonicalCaseContext,
): Promise<DeadlineTrackerSession> {
  const session = await createBrowserTaskSession({
    agentId: "agent-4-deadline-procedure",
    keepAlive: true,
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
  const session = await createBrowserTaskSession({
    agentId: "agent-5-defense-research",
    keepAlive: true,
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
  const session = await createBrowserTaskSession({
    agentId: "agent-6-legal-aid",
    keepAlive: true,
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
  | "agent-3-forms-navigator"
  | "agent-4-deadline-procedure"
  | "agent-5-defense-research"
  | "agent-6-legal-aid"
> = {
  forms: "agent-3-forms-navigator",
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
    | { key: "forms"; promise: Promise<FormsNavigatorSession> }
    | { key: "deadline"; promise: Promise<DeadlineTrackerSession> }
    | { key: "defense"; promise: Promise<DefenseResearchSession> }
    | { key: "legalAid"; promise: Promise<LegalAidSession> };

  const entries: Entry[] = [];

  for (const key of agents) {
    if (key === "forms") {
      entries.push({
        key: "forms",
        promise: launchFormsNavigatorSession(input.appSessionId, input.caseContext),
      });
    } else if (key === "deadline") {
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
    formsNavigatorSession: null,
    deadlineTrackerSession: null,
    defenseResearchSession: null,
    legalAidSession: null,
  };

  for (let i = 0; i < settled.length; i++) {
    const key = entries[i].key;
    const s = settled[i];

    if (s.status === "fulfilled") {
      if (key === "forms") {
        const value = s.value as FormsNavigatorSession;
        logServerEvent("dispatch_wave1_forms_navigator_ok", {
          appSessionId: input.appSessionId,
          browserSessionId: value.sessionId,
          status: value.status,
        });
        result.formsNavigatorSession = value;
      } else if (key === "deadline") {
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
      if (key === "forms") {
        logServerError("dispatch_wave1_forms_navigator_failed", s.reason, {
          appSessionId: input.appSessionId,
        });
      } else if (key === "deadline") {
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

export async function dispatchWave2Agent(
  input: DispatchWave2Input,
): Promise<DispatchWave2Result> {
  logServerEvent("dispatch_wave2_start", {
    appSessionId: input.sessionId,
    hasFilledPdf: Boolean(input.filledPdfUrl),
  });

  const session = await createBrowserTaskSession({
    agentId: "agent-9-efiling",
    keepAlive: true,
    outputSchema: EFILING_OUTPUT_SCHEMA,
    task: buildEfilingTask({
      appSessionId: input.sessionId,
      efilingUsername: input.efilingUsername,
      filledPdfUrl: input.filledPdfUrl,
      caseContext: input.caseContext,
    }),
  });

  logServerEvent("dispatch_wave2_efiling_ok", {
    appSessionId: input.sessionId,
    browserSessionId: session.id,
    status: session.status,
  });

  return {
    efilingSession: {
      sessionId: session.id,
      liveUrl: session.liveUrl ?? null,
      status: session.status,
      activeAgentId: "agent-9-efiling",
    },
  };
}

/** Single-agent helpers for `/api/sessions/[id]/run-*` routes. */
export async function dispatchFormsNavigator(input: {
  appSessionId: string;
  caseContext: CanonicalCaseContext;
}): Promise<DispatchWave1Result> {
  return dispatchWave1Agents({
    appSessionId: input.appSessionId,
    caseContext: input.caseContext,
    agents: ["forms"],
  });
}

export async function dispatchDeadlineTracker(input: {
  appSessionId: string;
  caseContext: CanonicalCaseContext;
}): Promise<DispatchWave1Result> {
  return dispatchWave1Agents({
    appSessionId: input.appSessionId,
    caseContext: input.caseContext,
    agents: ["deadline"],
  });
}

export function deriveHitlGateState(): HitlGateState {
  // TODO: Replace action items content while waiting for required user action.
  return {
    isBlockedOnUser: false,
    instruction: null,
    missingFacts: [],
  };
}

export function mergeFeeWaiverForPdfFiller(
  _result: FeeWaiverResult,
): FeeWaiverResult {
  // TODO: Pass Agent 7 eligibility output into Agent 3b payload.
  return _result;
}
