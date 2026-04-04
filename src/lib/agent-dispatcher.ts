import type {
  CaseFacts,
  ParsedDocumentFields,
  FeeWaiverResult,
  HitlGateState,
} from "@/lib/types";

export interface DispatchWave1Input {
  caseFacts: CaseFacts;
  parsedDocumentFields: ParsedDocumentFields | null;
}

export interface DispatchWave2Input {
  sessionId: string;
  efilingUsername: string;
}

export async function dispatchWave1Agents(_input: DispatchWave1Input): Promise<void> {
  // TODO: Fan out Agents 2-7 in parallel after Agent 1 classification.
  // TODO: Trigger Agent 3b immediately after Agent 3 form download completion.
  throw new Error("Not implemented: dispatchWave1Agents");
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
