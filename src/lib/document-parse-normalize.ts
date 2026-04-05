import type {
  CanonicalCaseContext,
  CaseFactConflict,
  CaseFactField,
  CaseFactSource,
  CaseFacts,
  DocumentNormalizedExtraction,
  LlmRawDocumentFields,
  ParsedDocumentFields,
  ServiceMethod,
} from "@/lib/types";
import {
  normalizeNoticeTypeToIntakeSlug,
  noticeTypesEquivalent,
} from "@/lib/notice-type-normalize";

/** Intake / document proceeding stages (must align with intake classifier enums). */
const STAGE_RANK: Record<string, number> = {
  unknown: 0,
  notice_served: 1,
  complaint_filed: 2,
  hearing_scheduled: 3,
  judgment_entered: 4,
};

function stageRank(stage: string | null | undefined): number {
  if (stage == null || stage === "") return 0;
  return STAGE_RANK[stage] ?? 0;
}

/**
 * If the document indicates a later procedural stage than intake, upgrade case facts.
 * Never downgrades intake from document.
 */
export function mergeCaseFactsWithDocumentStage(
  intake: CaseFacts,
  documentStage: string | null,
): CaseFacts {
  if (!documentStage) return intake;
  const iRank = stageRank(intake.proceedingStage);
  const dRank = stageRank(documentStage);
  if (dRank > iRank) {
    return { ...intake, proceedingStage: documentStage };
  }
  return intake;
}

function normalizeDocumentServiceMethod(value: string | null): ServiceMethod | null {
  if (
    value === "personal" ||
    value === "substituted" ||
    value === "posted_and_mailed"
  ) {
    return value;
  }
  return null;
}

function pushConflict(
  conflicts: CaseFactConflict[],
  field: CaseFactField,
  intakeValue: string | number | null,
  documentValue: string | number | null,
  resolution: "kept_intake" | "used_document",
  note?: string,
) {
  conflicts.push({
    field,
    intakeValue,
    documentValue,
    resolution,
    note: note ?? null,
  });
}

function setSource(
  sources: Partial<Record<CaseFactField, CaseFactSource>>,
  field: CaseFactField,
  source: CaseFactSource["source"],
  note?: string,
) {
  sources[field] = {
    source,
    note: note ?? null,
  };
}

function ensureMissingFactNames(caseFacts: CaseFacts, existing: string[]): string[] {
  const out = new Set(existing);
  const requiredMap: Array<[CaseFactField, string]> = [
    ["evictionType", "eviction_type"],
    ["proceedingStage", "proceeding_stage"],
    ["noticeType", "notice_type"],
    ["serviceDate", "service_date"],
    ["serviceMethod", "service_method"],
    ["jurisdiction", "jurisdiction"],
    ["claimedAmount", "claimed_amount"],
  ];
  for (const [field, missingName] of requiredMap) {
    if (caseFacts[field] == null) out.add(missingName);
  }
  return [...out];
}

export function buildCanonicalCaseContext(input: {
  caseFacts: CaseFacts;
  confidence: number;
  missingFacts: string[];
  needsHumanReview: boolean;
  parsedDocumentFields: ParsedDocumentFields | null;
  uploadedFileName?: string | null;
  documentParseError?: string | null;
}): CanonicalCaseContext {
  const nextCaseFacts: CaseFacts = { ...input.caseFacts };
  const conflicts: CaseFactConflict[] = [];
  const factSources: Partial<Record<CaseFactField, CaseFactSource>> = {};
  const document = input.parsedDocumentFields?.normalizedExtraction ?? null;

  for (const field of Object.keys(nextCaseFacts) as CaseFactField[]) {
    if (nextCaseFacts[field] != null) {
      setSource(factSources, field, "user_text", "Provided by unified intake narrative.");
    }
  }

  if (document) {
    if (nextCaseFacts.proceedingStage == null && document.proceedingStage) {
      nextCaseFacts.proceedingStage = document.proceedingStage;
      setSource(
        factSources,
        "proceedingStage",
        "uploaded_document",
        "Filled from uploaded document because intake text did not specify a stage.",
      );
    } else if (
      document.proceedingStage &&
      nextCaseFacts.proceedingStage &&
      document.proceedingStage !== nextCaseFacts.proceedingStage
    ) {
      const merged = mergeCaseFactsWithDocumentStage(
        { ...nextCaseFacts },
        document.proceedingStage,
      );
      if (merged.proceedingStage !== nextCaseFacts.proceedingStage) {
        pushConflict(
          conflicts,
          "proceedingStage",
          nextCaseFacts.proceedingStage,
          document.proceedingStage,
          "used_document",
          "Uploaded document indicated a later procedural stage.",
        );
        nextCaseFacts.proceedingStage = merged.proceedingStage;
        setSource(
          factSources,
          "proceedingStage",
          "reconciled",
          "Advanced to the later stage supported by the uploaded document.",
        );
      } else {
        pushConflict(
          conflicts,
          "proceedingStage",
          nextCaseFacts.proceedingStage,
          document.proceedingStage,
          "kept_intake",
          "Intake stage was kept because the uploaded document did not show a later stage.",
        );
      }
    }

    const documentServiceMethod = normalizeDocumentServiceMethod(document.serviceMethod);
    const documentClaims: Array<[CaseFactField, string | number | null, string]> = [
      ["noticeType", document.noticeType, "Uploaded document provided the notice type."],
      ["serviceDate", document.serviceDate, "Uploaded document provided the service date."],
      [
        "serviceMethod",
        documentServiceMethod,
        "Uploaded document provided the service method.",
      ],
      ["claimedAmount", document.claimedAmount, "Uploaded document provided the claimed amount."],
    ];

    for (const [field, documentValue, note] of documentClaims) {
      const intakeValue = nextCaseFacts[field];
      if (documentValue == null) continue;
      if (intakeValue == null) {
        nextCaseFacts[field] = documentValue as never;
        setSource(factSources, field, "uploaded_document", note);
        continue;
      }
      const sameMeaning =
        field === "noticeType" &&
        noticeTypesEquivalent(intakeValue, documentValue);
      if (sameMeaning || intakeValue === documentValue) {
        continue;
      }
      pushConflict(
        conflicts,
        field,
        intakeValue as string | number | null,
        documentValue,
        "kept_intake",
        "Conflict preserved for review; intake value kept unless deterministic rules say otherwise.",
      );
    }

    if (
      nextCaseFacts.jurisdiction == null &&
      document.courtName &&
      /los angeles/i.test(document.courtName)
    ) {
      nextCaseFacts.jurisdiction = "Los Angeles County";
      setSource(
        factSources,
        "jurisdiction",
        "reconciled",
        "Derived from the uploaded court name.",
      );
    }
  }

  for (const field of Object.keys(nextCaseFacts) as CaseFactField[]) {
    if (!(field in factSources)) {
      setSource(factSources, field, "unknown", "No reliable source resolved this fact.");
    }
  }

  return {
    caseFacts: nextCaseFacts,
    confidence: input.confidence,
    missingFacts: ensureMissingFactNames(nextCaseFacts, input.missingFacts),
    needsHumanReview:
      input.needsHumanReview ||
      conflicts.length > 0 ||
      (input.parsedDocumentFields?.validationWarnings.length ?? 0) > 0,
    parsedDocumentFields: input.parsedDocumentFields,
    uploadedFileName: input.uploadedFileName ?? null,
    documentParseError: input.documentParseError ?? null,
    factSources,
    conflicts,
  };
}

/** Deterministic UD-100 / complaint detection from visible document text (demo + production). */
export function detectUd100ComplaintFromText(haystack: string): boolean {
  const n = haystack.normalize("NFKC").replace(/\s+/g, " ");
  return (
    n.includes("Complaint—Unlawful Detainer") ||
    n.includes("Complaint-Unlawful Detainer") ||
    n.includes("Complaint – Unlawful Detainer") ||
    /\bUD-100\b/i.test(n)
  );
}

function buildHaystack(raw: LlmRawDocumentFields): string {
  const parts = [
    raw.documentHeaderOrTitleLine,
    raw.caseNumber,
    raw.courtName,
    raw.plaintiffNameFromPlaintiffLabel,
    raw.defendantNameFromDefendantLabel,
    raw.noticeTypeFromDocument,
    raw.propertyAddress,
    raw.serviceMethod,
    raw.signatureOrPrintedName,
    ...(raw.plaintiffOccurrences ?? []),
    ...(raw.defendantOccurrences ?? []),
    ...(raw.tenancyAllegations ?? []),
    ...(raw.noticeAllegations ?? []),
    ...(raw.serviceAllegations ?? []),
    ...(raw.rentalAssistanceAllegations ?? []),
    ...(raw.reliefRequested ?? []),
  ];
  return parts.filter(Boolean).join(" \n ");
}

/** Order: factual / procedural story → relief. Each string should be one material assertion. */
export function flattenAllegationGroups(
  groups: Pick<
    LlmRawDocumentFields,
    | "tenancyAllegations"
    | "noticeAllegations"
    | "serviceAllegations"
    | "rentalAssistanceAllegations"
    | "reliefRequested"
  >,
): string[] {
  const sections = [
    groups.tenancyAllegations,
    groups.noticeAllegations,
    groups.serviceAllegations,
    groups.rentalAssistanceAllegations,
    groups.reliefRequested,
  ];
  const out: string[] = [];
  for (const section of sections) {
    for (const line of section ?? []) {
      if (typeof line !== "string") continue;
      const t = line.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

export function normalizeAndValidateDocument(
  raw: LlmRawDocumentFields,
): {
  normalizedExtraction: DocumentNormalizedExtraction;
  validationWarnings: string[];
} {
  const haystack = buildHaystack(raw);
  const ud100 =
    detectUd100ComplaintFromText(haystack) ||
    raw.documentTypeGuess === "ud_100_complaint";

  const documentType: string | null = ud100 ? "ud_100_complaint" : emptyToNull(raw.documentTypeGuess);

  let proceedingStage: string | null = emptyToNull(raw.proceedingStageGuess);
  if (documentType === "ud_100_complaint") {
    proceedingStage = "complaint_filed";
  }

  const plaintiffName = emptyToNull(raw.plaintiffNameFromPlaintiffLabel);
  const defendantName = emptyToNull(raw.defendantNameFromDefendantLabel);

  let landlordName: string | null = emptyToNull(raw.landlordNameFromDocument);
  if (documentType === "ud_100_complaint" && plaintiffName) {
    landlordName = plaintiffName;
  }

  const noticeServiceDate = emptyToNull(raw.noticeServiceDate);
  const noticeExpirationDate = emptyToNull(raw.noticeExpirationDate);
  const complaintVerifiedDate = emptyToNull(raw.complaintVerifiedDate);
  const serviceDate = noticeServiceDate;

  const trimLines = (arr: string[] | undefined) =>
    (arr ?? [])
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);

  const tenancyAllegations = trimLines(raw.tenancyAllegations);
  const noticeAllegations = trimLines(raw.noticeAllegations);
  const serviceAllegations = trimLines(raw.serviceAllegations);
  const rentalAssistanceAllegations = trimLines(raw.rentalAssistanceAllegations);
  const reliefRequested = trimLines(raw.reliefRequested);

  const allegations = flattenAllegationGroups({
    tenancyAllegations,
    noticeAllegations,
    serviceAllegations,
    rentalAssistanceAllegations,
    reliefRequested,
  });

  const normalizedExtraction: DocumentNormalizedExtraction = {
    caseNumber: emptyToNull(raw.caseNumber),
    courtName: emptyToNull(raw.courtName),
    plaintiffName,
    defendantName,
    landlordName,
    claimedAmount: raw.claimedAmount,
    serviceDate,
    noticeServiceDate,
    noticeExpirationDate,
    complaintVerifiedDate,
    noticeType: (() => {
      const r = emptyToNull(raw.noticeTypeFromDocument);
      if (!r) return null;
      return normalizeNoticeTypeToIntakeSlug(r) ?? r;
    })(),
    serviceMethod: emptyToNull(raw.serviceMethod),
    propertyAddress: emptyToNull(raw.propertyAddress),
    documentType,
    proceedingStage,
    tenancyAllegations,
    noticeAllegations,
    serviceAllegations,
    rentalAssistanceAllegations,
    reliefRequested,
    allegations,
  };

  const validationWarnings = collectValidationWarnings(raw, normalizedExtraction);

  return { normalizedExtraction, validationWarnings };
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function collectValidationWarnings(
  raw: LlmRawDocumentFields,
  norm: DocumentNormalizedExtraction,
): string[] {
  const warnings: string[] = [];

  const pOcc = (raw.plaintiffOccurrences ?? [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueP = new Set(pOcc.map((s) => s.toLowerCase()));
  if (uniqueP.size > 1) {
    warnings.push(
      "Plaintiff name appears inconsistent across labeled occurrences in the document; verify the correct party.",
    );
  }

  const dOcc = (raw.defendantOccurrences ?? [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueD = new Set(dOcc.map((s) => s.toLowerCase()));
  if (uniqueD.size > 1) {
    warnings.push(
      "Defendant name appears inconsistent across labeled occurrences in the document; verify the correct party.",
    );
  }

  const sig = emptyToNull(raw.signatureOrPrintedName);
  const pl = norm.plaintiffName;
  if (sig && pl && sig.toLowerCase() !== pl.toLowerCase()) {
    warnings.push(
      "Signature or printed name differs from the labeled plaintiff; the labeled plaintiff field was used (not the signature).",
    );
  }

  return warnings;
}
