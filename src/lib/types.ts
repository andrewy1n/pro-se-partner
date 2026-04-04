export type { MessageResponse, SessionResponse } from "browser-use-sdk/v3";

export type AgentId =
  | "agent-1-intake"
  | "agent-2-document-parsing"
  | "agent-3-forms-navigator"
  | "agent-3b-pdf-filler"
  | "agent-4-deadline-procedure"
  | "agent-5-defense-research"
  | "agent-6-legal-aid"
  | "agent-7-fee-waiver"
  | "agent-9-efiling";

export type AgentStatus = "idle" | "queued" | "running" | "done" | "error" | "paused";
export type CaseStage = "stage-1-intake" | "stage-2-filing";
export type WaveId = "wave-1" | "wave-2";

export interface CaseFacts {
  // Structured output owned by Agent 1 Intake + Classification.
  evictionType: string | null;
  proceedingStage: string | null;
  noticeType: string | null;
  serviceDate: string | null;
  jurisdiction: string | null;
  claimedAmount: number | null;
}

/** Persisted client-side after intake API success; hydrates CaseContext on the session page. */
export interface IntakeSessionPayload {
  caseFacts: CaseFacts;
  confidence: number;
  missingFields: string[];
  needsHumanReview: boolean;
}

export interface ParsedDocumentFields {
  // Structured fields owned by Agent 2 Document Parsing.
  caseNumber: string | null;
  courtName: string | null;
  landlordName: string | null;
  allegations: string[];
}

export interface FormArtifact {
  // Produced by Agent 3 and Agent 3b.
  formCode: "UD-105" | "FW-001";
  fileName: string;
  downloadUrl: string;
  revisionLabel?: string;
}

export interface DeadlineResult {
  // Produced by Agent 4 Deadline & Procedure.
  responseDeadline: string | null;
  consequenceSummary: string | null;
  projectedTrialWindow: string | null;
  citations: Citation[];
}

export interface DefenseItem {
  // Produced by Agent 5 Defense Research.
  title: string;
  explanation: string;
  citations: Citation[];
}

export interface LegalAidItem {
  // Produced by Agent 6 Legal Aid.
  organizationName: string;
  distanceMiles?: number;
  hours?: string;
  contact?: string;
  eligibilityNotes?: string;
}

export interface FeeWaiverResult {
  // Produced by Agent 7 Fee Waiver Qualification.
  isEligible: boolean | null;
  reasoning: string | null;
}

export interface EfilingResult {
  // Produced by Agent 9 E-Filing.
  confirmationNumber: string | null;
  submittedAt: string | null;
}

export interface Citation {
  title: string;
  url?: string;
}

export interface ActivityFeedItem {
  id: string;
  agentId: AgentId;
  agentLabel: string;
  status: Extract<AgentStatus, "running" | "done" | "error">;
  message: string;
  createdAt: string;
}

export interface StatusPanelModel {
  countdownLabel: string;
  caseStage: CaseStage;
  callToAction: string | null;
}

export interface ActionChecklistItem {
  id: string;
  title: string;
  details?: string;
  status: "pending" | "in_progress" | "done";
}

export interface ActionItemsPanelModel {
  checklist: ActionChecklistItem[];
  formArtifacts: FormArtifact[];
}

export interface ResourcesPanelModel {
  defenses: DefenseItem[];
  legalAid: LegalAidItem[];
}

export interface HitlGateState {
  isBlockedOnUser: boolean;
  instruction: string | null;
}

export interface SessionSnapshot {
  sessionId: string;
  liveUrl: string | null;
  activeAgentId: AgentId | null;
  activeWave: WaveId | null;
  stage: CaseStage;
}
