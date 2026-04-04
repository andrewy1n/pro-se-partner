import type {
  CanonicalCaseContext,
  DeadlineTrackerSession,
  FeeWaiverResult,
  HitlGateState,
} from "@/lib/types";
import { createBrowserSession, sendAgentTask } from "@/lib/api";
import {
  buildDeadlineTrackerTask,
  DEADLINE_RESULT_OUTPUT_SCHEMA,
} from "@/lib/deadline-tracker";
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
  deadlineTrackerSession: DeadlineTrackerSession;
}

export async function dispatchWave1Agents(
  input: DispatchWave1Input,
): Promise<DispatchWave1Result> {
  logServerEvent("dispatch_wave1_start", {
    appSessionId: input.appSessionId,
    agent: "agent-4-deadline-procedure",
  });

  try {
    const session = await createBrowserSession({
      keepAlive: true,
      outputSchema: DEADLINE_RESULT_OUTPUT_SCHEMA,
    });

    await sendAgentTask({
      sessionId: session.id,
      agentId: "agent-4-deadline-procedure",
      outputSchema: DEADLINE_RESULT_OUTPUT_SCHEMA,
      task: `${buildDeadlineTrackerTask({
        caseContext: input.caseContext,
      })}

Internal tracking id: ${input.appSessionId}`,
    });

    const result = {
      deadlineTrackerSession: {
        sessionId: session.id,
        liveUrl: session.liveUrl ?? null,
        status: session.status,
        activeAgentId: "agent-4-deadline-procedure" as const,
      },
    };

    logServerEvent("dispatch_wave1_deadline_tracker_ok", {
      appSessionId: input.appSessionId,
      browserSessionId: result.deadlineTrackerSession.sessionId,
      status: result.deadlineTrackerSession.status,
      hasLiveUrl: Boolean(result.deadlineTrackerSession.liveUrl),
    });

    return result;
  } catch (err) {
    logServerError("dispatch_wave1_deadline_tracker_failed", err, {
      appSessionId: input.appSessionId,
    });
    throw err;
  }
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
