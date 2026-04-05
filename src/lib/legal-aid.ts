import { z } from "zod";
import type { CanonicalCaseContext, LegalAidItem } from "@/lib/types";

const legalAidItemSchema = z.object({
  organizationName: z.string().min(1),
  distanceMiles: z.number().nullable().optional(),
  hours: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  walkInAvailable: z.boolean(),
  eligibilityNotes: z.string().nullable().optional(),
});

export const legalAidResultSchema = z.object({
  organizations: z.array(legalAidItemSchema).max(2),
});

export const LEGAL_AID_RESULT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["organizations"],
  properties: {
    organizations: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["organizationName", "walkInAvailable"],
        properties: {
          organizationName: { type: "string" },
          distanceMiles: { type: ["number", "null"] },
          hours: { type: ["string", "null"] },
          contact: { type: ["string", "null"] },
          walkInAvailable: { type: "boolean" },
          eligibilityNotes: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

export function parseLegalAidResult(value: unknown): LegalAidItem[] | null {
  const candidate =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        })()
      : value;

  const parsed = legalAidResultSchema.safeParse(candidate);
  if (!parsed.success) return null;
  if (parsed.data.organizations.length === 0) return null;

  return parsed.data.organizations.map((o) => ({
    organizationName: o.organizationName,
    distanceMiles: o.distanceMiles ?? undefined,
    hours: o.hours ?? undefined,
    contact: o.contact ?? undefined,
    walkInAvailable: o.walkInAvailable,
    eligibilityNotes: o.eligibilityNotes ?? undefined,
  }));
}

export function buildLegalAidTask(input: {
  caseContext: CanonicalCaseContext;
}): string {
  const { caseFacts, parsedDocumentFields } = input.caseContext;
  const propertyAddress =
    parsedDocumentFields?.normalizedExtraction?.propertyAddress ?? null;
  const locationContext = propertyAddress
    ? `Property address: ${propertyAddress}`
    : `Jurisdiction: ${caseFacts.jurisdiction ?? "Los Angeles County"}`;

  return `You are the Legal Aid agent for Pro Se Partner.

Your job is to find legal aid organizations that can help a tenant facing an unlawful detainer (eviction) action in Los Angeles County.

Requirements:
- Navigate both websites below and return up to 5 organizations in the output.
- Find current contact information, hours, and eligibility for each organization from its site.
- Record walk-in availability accurately — only mark walkInAvailable as true if the organization explicitly offers walk-in services.
- Estimate distance in miles from the tenant's location when possible; use null if you cannot determine it.
- Record eligibility notes only from what the organization states on its website — do not invent criteria.
- The final answer must match the provided structured output schema exactly.

Organizations to show (navigate each site):

1. Bet Tzedek Legal Services — https://bettzedek.org
   Specialty: Eviction defense, housing law. Check their intake hours and self-help clinics.

2. Legal Aid Foundation of Los Angeles (LAFLA) — https://lafla.org
   Specialty: Eviction defense. Check office locations, hours, and how to apply.

Tenant location context:
${locationContext}

Case type: Unlawful detainer (eviction) — ${caseFacts.evictionType ?? "type unknown"}`;
}
