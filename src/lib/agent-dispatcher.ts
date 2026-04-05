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
import {
  buildFormsNavigatorTask,
  FORMS_NAVIGATOR_OUTPUT_SCHEMA,
} from "@/lib/forms-navigator";
import { logServerError, logServerEvent } from "@/lib/server-log";

export interface DispatchCaseContextInput {
  appSessionId: string;
  caseContext: CanonicalCaseContext;
}

export interface DispatchWave2Input {
  sessionId: string;
  efilingUsername: string;
}

/** Browser Use handle for either Deadline Tracker or Forms Navigator. */
export interface BrowserAgentSessionHandle {
  sessionId: string;
  liveUrl: string | null;
  status: DeadlineTrackerSession["status"];
  activeAgentId: DeadlineTrackerSession["activeAgentId"] | "agent-3-forms-navigator";
}

export async function dispatchDeadlineTracker(
  input: DispatchCaseContextInput,
): Promise<BrowserAgentSessionHandle> {
  logServerEvent("dispatch_deadline_tracker_start", {
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

    const result: BrowserAgentSessionHandle = {
      sessionId: session.id,
      liveUrl: session.liveUrl ?? null,
      status: session.status,
      activeAgentId: "agent-4-deadline-procedure",
    };

    logServerEvent("dispatch_deadline_tracker_ok", {
      appSessionId: input.appSessionId,
      browserSessionId: result.sessionId,
      status: result.status,
      hasLiveUrl: Boolean(result.liveUrl),
    });

    return result;
  } catch (err) {
    logServerError("dispatch_deadline_tracker_failed", err, {
      appSessionId: input.appSessionId,
    });
    throw err;
  }
}

export async function dispatchFormsNavigator(
  input: DispatchCaseContextInput,
): Promise<BrowserAgentSessionHandle> {
  logServerEvent("dispatch_forms_navigator_start", {
    appSessionId: input.appSessionId,
    agent: "agent-3-forms-navigator",
  });

  try {
    const session = await createBrowserSession({
      keepAlive: true,
      outputSchema: FORMS_NAVIGATOR_OUTPUT_SCHEMA,
    });

    await sendAgentTask({
      sessionId: session.id,
      agentId: "agent-3-forms-navigator",
      outputSchema: FORMS_NAVIGATOR_OUTPUT_SCHEMA,
      task: buildFormsNavigatorTask({
        caseContext: input.caseContext,
        appSessionId: input.appSessionId,
      }),
    });

    const result: BrowserAgentSessionHandle = {
      sessionId: session.id,
      liveUrl: session.liveUrl ?? null,
      status: session.status,
      activeAgentId: "agent-3-forms-navigator",
    };

    logServerEvent("dispatch_forms_navigator_ok", {
      appSessionId: input.appSessionId,
      browserSessionId: result.sessionId,
      status: result.status,
      hasLiveUrl: Boolean(result.liveUrl),
    });

    return result;
  } catch (err) {
    logServerError("dispatch_forms_navigator_failed", err, {
      appSessionId: input.appSessionId,
    });
    throw err;
  }
}

/** @deprecated Use dispatchDeadlineTracker — intake no longer auto-starts agents. */
export async function dispatchWave1Agents(
  input: DispatchCaseContextInput,
): Promise<{ deadlineTrackerSession: DeadlineTrackerSession }> {
  const handle = await dispatchDeadlineTracker(input);
  return {
    deadlineTrackerSession: {
      sessionId: handle.sessionId,
      liveUrl: handle.liveUrl,
      status: handle.status,
      activeAgentId: "agent-4-deadline-procedure",
    },
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
