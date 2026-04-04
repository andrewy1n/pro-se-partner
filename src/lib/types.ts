import type { MessageResponse, SessionResponse } from "browser-use-sdk/v3";

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
export type ServiceMethod =
  | "personal"
  | "substituted"
  | "posted_and_mailed";
export type BrowserUseSessionStatus =
  | "created"
  | "idle"
  | "running"
  | "stopped"
  | "timed_out"
  | "error";
export type DeadlineResultStatus = "ready" | "needs_input" | "error";

export interface CaseFacts {
  // Structured output owned by Agent 1 Intake + Classification.
  evictionType: string | null;
  proceedingStage: string | null;
  noticeType: string | null;
  serviceDate: string | null;
  serviceMethod: ServiceMethod | null;
  jurisdiction: string | null;
  claimedAmount: number | null;
}

/** Persisted client-side after intake API success; hydrates CaseContext on the session page. */
export interface IntakeSessionPayload {
  caseFacts: CaseFacts;
  confidence: number;
  missingFields: string[];
  needsHumanReview: boolean;
  deadlineTrackerSession: DeadlineTrackerSession | null;
  /** Populated when the user uploaded a document and parsing succeeded. */
  parsedDocumentFields?: ParsedDocumentFields | null;
  /** Original filename from intake upload (for display). */
  uploadedFileName?: string | null;
  /** Set when upload existed but parsing failed; intake still proceeds. */
  documentParseError?: string | null;
}

/**
 * Model output before deterministic rules, validation, and merging.
 * Party names must come only from explicit PLAINTIFF: / DEFENDANT: style labels when present.
 */
export interface LlmRawDocumentFields {
  plaintiffNameFromPlaintiffLabel: string | null;
  defendantNameFromDefendantLabel: string | null;
  /** Only when an explicit "landlord" label exists; do not guess from signatures. */
  landlordNameFromDocument: string | null;
  caseNumber: string | null;
  courtName: string | null;
  claimedAmount: number | null;
  noticeTypeFromDocument: string | null;
  noticeServiceDate: string | null;
  noticeExpirationDate: string | null;
  serviceMethod: string | null;
  propertyAddress: string | null;
  /** Tenancy / lease facts from numbered complaint paragraphs (e.g. UD-100 items 6–7): rent, term, parties, TPA, etc. */
  tenancyAllegations: string[];
  /** Notice allegations (e.g. 3-day, contents, election of forfeiture) — not service facts. */
  noticeAllegations: string[];
  /** How and when notice was served; expiration; compliance (e.g. items 9–11, 13–14). */
  serviceAllegations: string[];
  /** Rental assistance certifications / statutory checkboxes when present (e.g. item 20). */
  rentalAssistanceAllegations: string[];
  /** Prayer for relief: possession, costs, judgment amounts (typically later-numbered items). */
  reliefRequested: string[];
  /** Distinct plaintiff strings taken only from labeled PLAINTIFF (or equivalent) lines — for validation. */
  plaintiffOccurrences: string[];
  defendantOccurrences: string[];
  signatureOrPrintedName: string | null;
  /** Prominent title/header line as read from the document (used for UD-100 detection). */
  documentHeaderOrTitleLine: string | null;
  documentTypeGuess: string | null;
  proceedingStageGuess: string | null;
}

/** Canonical fields after normalization (rules + validation). */
export interface DocumentNormalizedExtraction {
  caseNumber: string | null;
  courtName: string | null;
  plaintiffName: string | null;
  defendantName: string | null;
  landlordName: string | null;
  claimedAmount: number | null;
  /** Alias for primary date from the document (typically notice or summons service). */
  serviceDate: string | null;
  noticeServiceDate: string | null;
  noticeExpirationDate: string | null;
  noticeType: string | null;
  serviceMethod: string | null;
  propertyAddress: string | null;
  documentType: string | null;
  proceedingStage: string | null;
  tenancyAllegations: string[];
  noticeAllegations: string[];
  serviceAllegations: string[];
  rentalAssistanceAllegations: string[];
  reliefRequested: string[];
  /** Flattened list for display: tenancy → notice → service → rental assistance → relief (order preserved). */
  allegations: string[];
}

export interface ParsedDocumentFields {
  validationWarnings: string[];
  /** Unmodified structured output from the extraction model (JSON-serializable). */
  rawExtraction: Record<string, unknown>;
  normalizedExtraction: DocumentNormalizedExtraction;
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
  status: DeadlineResultStatus;
  responseDeadline: string | null;
  consequenceSummary: string | null;
  projectedTrialWindow: string | null;
  citations: Citation[];
  missingFacts: string[];
  explanation: string | null;
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
  consequenceSummary: string | null;
  projectedTrialWindow: string | null;
  citations: Citation[];
  missingFacts: string[];
  explanation: string | null;
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
  status: BrowserUseSessionStatus | null;
}

export interface DeadlineTrackerSession {
  sessionId: string;
  liveUrl: string | null;
  status: BrowserUseSessionStatus;
  activeAgentId: Extract<AgentId, "agent-4-deadline-procedure">;
}

export interface SessionPollResponse {
  activeSession: SessionSnapshot | null;
  deadlineResult: DeadlineResult | null;
  messages: MessageResponse[];
}
