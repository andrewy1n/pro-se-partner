import type { CaseStage, Citation } from "@/lib/types";

export type TimelineSourceItem = {
  label: string;
  href?: string;
};

export type TimelineDisplayModel = {
  headline: string;
  subheadline?: string;
  stageLabel: string;
  knownFacts: string[];
  missingFacts: string[];
  riskText?: string;
  trialTimingText?: string;
  nextStepText?: string;
  sources?: TimelineSourceItem[];
};

export type TimelinePanelInput = {
  responseDeadline: string | null;
  sessionCaseStage: CaseStage;
  proceedingStage: string | null;
  consequenceSummary: string | null;
  projectedTrialWindow: string | null;
  citations: Citation[];
  missingFacts: string[];
  explanation: string | null;
  nextStep: string | null;
};

const PROCEEDING_STAGE_LABELS: Record<string, string> = {
  notice_served: "Notice served",
  complaint_filed: "Complaint filed",
  complaint_served: "Complaint served",
  hearing_scheduled: "Hearing scheduled",
  judgment_entered: "Judgment entered",
};

const SESSION_CASE_STAGE_LABELS: Record<CaseStage, string> = {
  "stage-1-intake": "Intake in progress",
  "stage-2-filing": "Filing in progress",
};

function humanizeFactLine(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (!t.includes("_")) return t;
  return t.replace(/_/g, " ").replace(/\s+/g, " ");
}

function stripActionNoise(text: string): string {
  return text.replace(/^\s*action\s*required\s*:\s*/i, "").trim();
}

function splitExplanationToBullets(explanation: string | null): string[] {
  if (!explanation?.trim()) return [];
  const t = explanation.trim();
  const byNewline = t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline.map(humanizeFactLine);
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(humanizeFactLine);
}

function formatDeadlineDisplay(raw: string): string {
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return raw;
}

function hasComputedDeadline(deadline: string | null): boolean {
  if (deadline == null || deadline === "") return false;
  const t = deadline.trim();
  if (t === "TBD" || /^tbd$/i.test(t)) return false;
  const d = new Date(t);
  return !Number.isNaN(d.getTime());
}

function resolveStageLabel(
  sessionCaseStage: CaseStage,
  proceedingStage: string | null,
): string {
  if (proceedingStage) {
    const mapped = PROCEEDING_STAGE_LABELS[proceedingStage];
    if (mapped) return mapped;
    return humanizeFactLine(proceedingStage);
  }
  return SESSION_CASE_STAGE_LABELS[sessionCaseStage] ?? "Case in progress";
}

function buildMissingSubheadline(missingFacts: string[]): string | undefined {
  if (!missingFacts.length) return undefined;
  const lines = missingFacts.map(humanizeFactLine).filter(Boolean);
  if (!lines.length) return undefined;
  if (lines.length === 1) return `Missing: ${lines[0]}`;
  if (lines.length === 2) return `Missing: ${lines[0]} and ${lines[1]}`;
  return `Missing: ${lines.slice(0, -1).join(", ")} and ${lines[lines.length - 1]}`;
}

export function buildTimelineDisplayModel(
  input: TimelinePanelInput | null,
): TimelineDisplayModel {
  if (!input) {
    return {
      headline: "Cannot calculate yet",
      subheadline: "Waiting for deadline tracker results.",
      stageLabel: "Intake in progress",
      knownFacts: [],
      missingFacts: [],
    };
  }

  const hasDeadline = hasComputedDeadline(input.responseDeadline);
  const headline = hasDeadline
    ? formatDeadlineDisplay(input.responseDeadline!)
    : "Cannot calculate yet";

  const subheadline = hasDeadline
    ? undefined
    : buildMissingSubheadline(input.missingFacts);

  const knownFacts = splitExplanationToBullets(input.explanation);
  const missingFacts = input.missingFacts.map(humanizeFactLine).filter(Boolean);

  const riskText = input.consequenceSummary?.trim() || undefined;
  const trialTimingText = input.projectedTrialWindow?.trim() || undefined;

  let nextStepText: string | undefined;
  if (input.nextStep?.trim()) {
    nextStepText = stripActionNoise(input.nextStep.trim());
  }

  const sources: TimelineSourceItem[] = input.citations
    .map((c) => ({
      label: c.title.trim(),
      href: c.url,
    }))
    .filter((s) => s.label.length > 0);
  const sourcesOut = sources.length ? sources : undefined;

  return {
    headline,
    subheadline,
    stageLabel: resolveStageLabel(
      input.sessionCaseStage,
      input.proceedingStage,
    ),
    knownFacts,
    missingFacts,
    riskText,
    trialTimingText,
    nextStepText,
    sources: sourcesOut,
  };
}
