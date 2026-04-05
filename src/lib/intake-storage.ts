import type {
  CanonicalCaseContext,
  DocumentNormalizedExtraction,
  IntakeSessionPayload,
  ParsedDocumentFields,
} from "@/lib/types";
import { flattenAllegationGroups } from "@/lib/document-parse-normalize";

export const INTAKE_STORAGE_KEY_PREFIX = "pro-se-partner:intake:";

export function intakeStorageKey(sessionId: string): string {
  return `${INTAKE_STORAGE_KEY_PREFIX}${sessionId}`;
}

function ensureNormalizedAllegationGroups(
  ne: DocumentNormalizedExtraction,
): DocumentNormalizedExtraction {
  const tenancyAllegations = Array.isArray(ne.tenancyAllegations)
    ? ne.tenancyAllegations.filter((x) => typeof x === "string")
    : [];
  const noticeAllegations = Array.isArray(ne.noticeAllegations)
    ? ne.noticeAllegations.filter((x) => typeof x === "string")
    : [];
  const serviceAllegations = Array.isArray(ne.serviceAllegations)
    ? ne.serviceAllegations.filter((x) => typeof x === "string")
    : [];
  const rentalAssistanceAllegations = Array.isArray(ne.rentalAssistanceAllegations)
    ? ne.rentalAssistanceAllegations.filter((x) => typeof x === "string")
    : [];
  const reliefRequested = Array.isArray(ne.reliefRequested)
    ? ne.reliefRequested.filter((x) => typeof x === "string")
    : [];

  const groupCount =
    tenancyAllegations.length +
    noticeAllegations.length +
    serviceAllegations.length +
    rentalAssistanceAllegations.length +
    reliefRequested.length;

  const legacyFlat = Array.isArray(ne.allegations)
    ? ne.allegations.filter((x) => typeof x === "string")
    : [];

  const allegations =
    groupCount > 0
      ? flattenAllegationGroups({
          tenancyAllegations,
          noticeAllegations,
          serviceAllegations,
          rentalAssistanceAllegations,
          reliefRequested,
        })
      : legacyFlat;

  return {
    ...ne,
    tenancyAllegations,
    noticeAllegations,
    serviceAllegations,
    rentalAssistanceAllegations,
    reliefRequested,
    allegations,
  };
}

function migrateLegacyParsedDocumentFields(
  raw: unknown,
): ParsedDocumentFields | null | undefined {
  if (raw == null) return raw;
  if (typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if ("normalizedExtraction" in o && o.normalizedExtraction) {
    const parsed = raw as ParsedDocumentFields;
    return {
      ...parsed,
      normalizedExtraction: ensureNormalizedAllegationGroups(parsed.normalizedExtraction),
    };
  }
  if (!("caseNumber" in o) && !("landlordName" in o) && !("allegations" in o)) {
    return undefined;
  }
  const allegations = Array.isArray(o.allegations)
    ? (o.allegations as string[]).filter((x) => typeof x === "string")
    : [];
  const norm: DocumentNormalizedExtraction = {
    caseNumber: typeof o.caseNumber === "string" ? o.caseNumber : null,
    courtName: typeof o.courtName === "string" ? o.courtName : null,
    plaintiffName: null,
    defendantName: null,
    landlordName: typeof o.landlordName === "string" ? o.landlordName : null,
    claimedAmount: typeof o.claimedAmount === "number" ? o.claimedAmount : null,
    serviceDate: typeof o.serviceDate === "string" ? o.serviceDate : null,
    noticeServiceDate: null,
    noticeExpirationDate: null,
    noticeType: null,
    serviceMethod: null,
    propertyAddress: null,
    documentType: null,
    proceedingStage: null,
    tenancyAllegations: [],
    noticeAllegations: [],
    serviceAllegations: [],
    rentalAssistanceAllegations: [],
    reliefRequested: [],
    allegations,
  };
  return {
    validationWarnings: [],
    rawExtraction: { ...o },
    normalizedExtraction: norm,
  };
}

function ensureCanonicalCaseContext(raw: unknown): CanonicalCaseContext | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  if (!candidate.caseFacts || typeof candidate.caseFacts !== "object") return null;

  const parsedDocumentFields = migrateLegacyParsedDocumentFields(candidate.parsedDocumentFields);
  const missingFacts = Array.isArray(candidate.missingFacts)
    ? candidate.missingFacts.filter((x): x is string => typeof x === "string")
    : Array.isArray(candidate.missingFields)
      ? candidate.missingFields.filter((x): x is string => typeof x === "string")
      : [];

  return {
    caseFacts: candidate.caseFacts as CanonicalCaseContext["caseFacts"],
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : 0,
    missingFacts,
    needsHumanReview: Boolean(candidate.needsHumanReview),
    parsedDocumentFields: parsedDocumentFields === undefined ? null : parsedDocumentFields,
    uploadedFileName:
      typeof candidate.uploadedFileName === "string" ? candidate.uploadedFileName : null,
    documentParseError:
      typeof candidate.documentParseError === "string" ? candidate.documentParseError : null,
    factSources:
      candidate.factSources && typeof candidate.factSources === "object"
        ? (candidate.factSources as CanonicalCaseContext["factSources"])
        : {},
    conflicts: Array.isArray(candidate.conflicts)
      ? (candidate.conflicts as CanonicalCaseContext["conflicts"])
      : [],
  };
}

export function parseIntakeSessionPayload(raw: string): IntakeSessionPayload | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.caseContext && typeof parsed.caseContext === "object") {
      const caseContext = ensureCanonicalCaseContext(parsed.caseContext);
      if (!caseContext) return null;
      return {
        caseContext,
        dispatched: Boolean(parsed.dispatched),
        formsNavigatorSession:
          "formsNavigatorSession" in parsed && parsed.formsNavigatorSession !== undefined
            ? (parsed.formsNavigatorSession as IntakeSessionPayload["formsNavigatorSession"])
            : null,
        deadlineTrackerSession:
          "deadlineTrackerSession" in parsed && parsed.deadlineTrackerSession !== undefined
            ? (parsed.deadlineTrackerSession as IntakeSessionPayload["deadlineTrackerSession"])
            : null,
        defenseResearchSession:
          "defenseResearchSession" in parsed && parsed.defenseResearchSession !== undefined
            ? (parsed.defenseResearchSession as IntakeSessionPayload["defenseResearchSession"])
            : null,
        legalAidSession:
          "legalAidSession" in parsed && parsed.legalAidSession !== undefined
            ? (parsed.legalAidSession as IntakeSessionPayload["legalAidSession"])
            : null,
        efilingSession:
          "efilingSession" in parsed && parsed.efilingSession !== undefined
            ? (parsed.efilingSession as IntakeSessionPayload["efilingSession"])
            : null,
      };
    }

    const legacyCaseContext = ensureCanonicalCaseContext(parsed);
    if (!legacyCaseContext) return null;
    return {
      caseContext: legacyCaseContext,
      dispatched: Boolean(parsed.dispatched),
      formsNavigatorSession: null,
      deadlineTrackerSession:
        "deadlineTrackerSession" in parsed && parsed.deadlineTrackerSession !== undefined
          ? (parsed.deadlineTrackerSession as IntakeSessionPayload["deadlineTrackerSession"])
          : null,
      defenseResearchSession: null,
      legalAidSession: null,
      efilingSession: null,
    };
  } catch {
    return null;
  }
}
