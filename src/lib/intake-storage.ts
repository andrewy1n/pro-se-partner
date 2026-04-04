import type {
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

export function parseIntakeSessionPayload(raw: string): IntakeSessionPayload | null {
  try {
    const v = JSON.parse(raw) as IntakeSessionPayload;
    if (!v?.caseFacts || typeof v.caseFacts !== "object") return null;
    const migrated = migrateLegacyParsedDocumentFields(v.parsedDocumentFields);
    if (migrated !== undefined) {
      v.parsedDocumentFields = migrated;
    }
    return v;
  } catch {
    return null;
  }
}
