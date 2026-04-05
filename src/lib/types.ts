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

/** Subset of Wave 1 browser agents the user can dispatch from the session dashboard. */
export type Wave1AgentKey = "forms" | "deadline" | "defense" | "legalAid";

export const WAVE1_AGENT_KEYS_ALL: readonly Wave1AgentKey[] = [
  "forms",
  "deadline",
  "defense",
  "legalAid",
];

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

export type CaseFactField = keyof CaseFacts;

export type CaseFactSourceKind =
  | "user_text"
  | "uploaded_document"
  | "reconciled"
  | "unknown";

export interface CaseFactSource {
  source: CaseFactSourceKind;
  note?: string | null;
}

export interface CaseFactConflict {
  field: CaseFactField;
  intakeValue: string | number | null;
  documentValue: string | number | null;
  resolution: "kept_intake" | "used_document";
  note?: string | null;
}

export type CaseFactSources = Partial<Record<CaseFactField, CaseFactSource>>;

export interface CanonicalCaseContext {
  caseFacts: CaseFacts;
  confidence: number;
  missingFacts: string[];
  needsHumanReview: boolean;
  parsedDocumentFields?: ParsedDocumentFields | null;
  uploadedFileName?: string | null;
  documentParseError?: string | null;
  factSources: CaseFactSources;
  conflicts: CaseFactConflict[];
}

/** POST /api/agents/dispatch — omit `agents` to run all Wave 1 agents. */
export interface DispatchWave1RequestBody {
  sessionId: string;
  caseContext: CanonicalCaseContext;
  agents?: Wave1AgentKey[];
}

/** Persisted client-side after intake API success; hydrates CaseContext on the session page. */
export interface IntakeSessionPayload {
  caseContext: CanonicalCaseContext;
  /** True once at least one Wave 1 browser session id is stored (successful launch). */
  dispatched: boolean;
  formsNavigatorSession: FormsNavigatorSession | null;
  deadlineTrackerSession: DeadlineTrackerSession | null;
  defenseResearchSession: DefenseResearchSession | null;
  legalAidSession: LegalAidSession | null;
}

export interface IntakeSubmitResponse {
  sessionId: string;
  caseContext: CanonicalCaseContext;
}

export interface DispatchWave1Response {
  formsNavigatorSession: FormsNavigatorSession | null;
  deadlineTrackerSession: DeadlineTrackerSession | null;
  defenseResearchSession: DefenseResearchSession | null;
  legalAidSession: LegalAidSession | null;
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
  variant: "original" | "filled";
  fileName: string;
  downloadUrl: string;
  revisionLabel?: string;
}

export type PdfFillStatus = "idle" | "preparing" | "filling" | "done" | "failed";
export type PdfFillErrorCode =
  | "FORM_ARTIFACT_MISSING"
  | "PDF_DECODE_FAILED"
  | "PDF_PARSE_FAILED"
  | "PDF_FILL_FAILED"
  | "PDF_SERIALIZE_FAILED"
  | "corrupt_pdf_structure"
  | "encrypted_pdf"
  | "xfa_or_unsupported_form"
  | "invalid_pdf_structure"
  | "unknown_fill_error";

/** POST /api/sessions/[id]/fill-pdf success body */
export interface PdfFillResult {
  formCode: "UD-105";
  fileName: string;
  pdfBase64: string;
  missingFields: string[];
  warnings: string[];
}

export interface PdfFillState {
  status: PdfFillStatus;
  errorCode: PdfFillErrorCode | null;
  errorMessage: string | null;
}

export interface DownloadedForm {
  formTitleVerified: string;
  revisionLabel: string | null;
  fileName: string;
  pdfBase64: string;
}

export interface FormsNavigatorResult {
  ud105: DownloadedForm | null;
  fw001?: DownloadedForm | null;
  notes: string[];
}

export interface TimelineMilestone {
  label: string;
  date: string | null;      // ISO date string e.g. "2026-04-09"
  dateLabel: string | null; // Human-readable fallback e.g. "April 20–30 (projected)"
  description: string | null;
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
  milestones: TimelineMilestone[];
}

export interface DefenseItem {
  // Produced by Agent 5 Defense Research.
  title: string;
  strength: "strong" | "possible";
  explanation: string;
  citations: Citation[];
}

export interface LegalAidItem {
  // Produced by Agent 6 Legal Aid.
  organizationName: string;
  distanceMiles?: number;
  hours?: string;
  contact?: string;
  walkInAvailable?: boolean;
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

export type ActivityFeedKind = "text" | "tool_call" | "thinking" | "fallback";

interface ActivityFeedItemBase {
  id: string;
  agentId: AgentId;
  agentLabel: string;
  status: Extract<AgentStatus, "running" | "done" | "error">;
  createdAt: string;
}

export type ActivityFeedItem =
  | (ActivityFeedItemBase & {
      feedKind: "text";
      message: string;
    })
  | (ActivityFeedItemBase & {
      feedKind: "tool_call";
      toolName: string;
      displayName: string;
      displayValue: string;
    })
  | (ActivityFeedItemBase & {
      feedKind: "thinking";
      fullText: string;
    })
  | (ActivityFeedItemBase & {
      feedKind: "fallback";
      label: string;
      rawSnippet: string;
    });

export interface StatusPanelModel {
  countdownLabel: string;
  caseStage: CaseStage;
  callToAction: string | null;
  consequenceSummary: string | null;
  projectedTrialWindow: string | null;
  citations: Citation[];
  missingFacts: string[];
  explanation: string | null;
  milestones: TimelineMilestone[];
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
  missingFacts: string[];
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

export interface FormsNavigatorSession {
  sessionId: string;
  liveUrl: string | null;
  status: BrowserUseSessionStatus;
  activeAgentId: Extract<AgentId, "agent-3-forms-navigator">;
}

export interface DefenseResearchSession {
  sessionId: string;
  liveUrl: string | null;
  status: BrowserUseSessionStatus;
  activeAgentId: Extract<AgentId, "agent-5-defense-research">;
}

export interface LegalAidSession {
  sessionId: string;
  liveUrl: string | null;
  status: BrowserUseSessionStatus;
  activeAgentId: Extract<AgentId, "agent-6-legal-aid">;
}

export interface SessionPollResponse {
  activeSession: SessionSnapshot | null;
  formsNavigatorResult: FormsNavigatorResult | null;
  deadlineResult: DeadlineResult | null;
  defenseResult: DefenseItem[] | null;
  legalAidResult: LegalAidItem[] | null;
  messages: MessageResponse[];
}

export interface SessionStreamMessageEvent {
  type: "message";
  agentId: AgentId;
  message: MessageResponse;
}

export interface SessionStreamTerminalEvent {
  type: "terminal";
  agentId: AgentId;
  status: BrowserUseSessionStatus | null;
}

export interface SessionStreamErrorEvent {
  type: "error";
  agentId: AgentId;
  message: string;
}

export type SessionStreamEvent =
  | SessionStreamMessageEvent
  | SessionStreamTerminalEvent
  | SessionStreamErrorEvent;
