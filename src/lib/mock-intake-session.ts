import type { CanonicalCaseContext, DocumentNormalizedExtraction, IntakeSessionPayload } from "@/lib/types";

/** Stable id for local dev / quota bypass — must match URL `/session/[id]`. */
export const MOCK_APP_SESSION_ID = "dev-mock-session";

function mockNormalizedExtraction(): DocumentNormalizedExtraction {
  return {
    caseNumber: "24UD01234",
    courtName: "Superior Court of California, County of Los Angeles",
    plaintiffName: "Demo Property Owner LLC",
    defendantName: "Jane A. Tenant",
    landlordName: "Demo Property Owner LLC",
    claimedAmount: 2400,
    serviceDate: "2025-03-01",
    noticeServiceDate: "2025-03-01",
    noticeExpirationDate: "2025-03-04",
    noticeType: "3_day_pay_or_quit",
    serviceMethod: "personal",
    propertyAddress: "123 Main St, Los Angeles, CA 90012",
    documentType: "summons_complaint",
    proceedingStage: "complaint_filed",
    tenancyAllegations: [
      "Month-to-month tenancy; rent $800/month. Alleged violation of the Tenant Protection Act (AB 1482); alleged lease violation under 1946.2(c).",
    ],
    noticeAllegations: ["Three-day notice to pay or quit served March 1."],
    serviceAllegations: ["Summons and complaint personally served."],
    rentalAssistanceAllegations: [],
    reliefRequested: ["Possession", "Unpaid rent"],
    allegations: [],
  };
}

export function buildMockCaseContext(): CanonicalCaseContext {
  return {
    caseFacts: {
      evictionType: "nonpayment",
      proceedingStage: "complaint_filed",
      noticeType: "3_day_pay_or_quit",
      serviceDate: "2025-03-01",
      serviceMethod: "personal",
      jurisdiction: "Los Angeles County",
      claimedAmount: 2400,
    },
    confidence: 0.9,
    missingFacts: [],
    needsHumanReview: false,
    parsedDocumentFields: {
      validationWarnings: [],
      rawExtraction: { source: "mock-intake-session" },
      normalizedExtraction: mockNormalizedExtraction(),
    },
    uploadedFileName: null,
    documentParseError: null,
    factSources: {
      evictionType: { source: "user_text" },
      proceedingStage: { source: "user_text" },
      noticeType: { source: "user_text" },
    },
    conflicts: [],
  };
}

export function buildMockIntakeSessionPayload(): IntakeSessionPayload {
  return {
    caseContext: buildMockCaseContext(),
    dispatched: false,
    formsNavigatorSession: null,
    deadlineTrackerSession: null,
    defenseResearchSession: null,
    legalAidSession: null,
    efilingSession: null,
  };
}
