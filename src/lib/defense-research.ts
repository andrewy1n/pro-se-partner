import { z } from "zod";
import type { CanonicalCaseContext, DefenseItem } from "@/lib/types";

const defenseCitationSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().nullable().optional(),
});

const defenseItemSchema = z.object({
  title: z.string().min(1),
  strength: z.enum(["strong", "possible"]),
  explanation: z.string().min(1),
  citations: z.array(defenseCitationSchema).max(4),
});

export const defenseResultSchema = z.object({
  defenses: z.array(defenseItemSchema).max(6),
});

export const DEFENSE_RESULT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["defenses"],
  properties: {
    defenses: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "strength", "explanation", "citations"],
        properties: {
          title: { type: "string" },
          strength: { type: "string", enum: ["strong", "possible"] },
          explanation: { type: "string" },
          citations: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title"],
              properties: {
                title: { type: "string" },
                url: { type: ["string", "null"] },
              },
            },
          },
        },
      },
    },
  },
} as const;

export function parseDefenseResult(value: unknown): DefenseItem[] | null {
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

  const parsed = defenseResultSchema.safeParse(candidate);
  if (!parsed.success) return null;
  if (parsed.data.defenses.length === 0) return null;

  return parsed.data.defenses.map((d) => ({
    title: d.title,
    strength: d.strength,
    explanation: d.explanation,
    citations: d.citations.map((c) =>
      c.url ? { title: c.title, url: c.url } : { title: c.title },
    ),
  }));
}

export function buildDefenseResearchTask(input: {
  caseContext: CanonicalCaseContext;
}): string {
  const { caseFacts, parsedDocumentFields, missingFacts } = input.caseContext;
  const allegations = parsedDocumentFields?.normalizedExtraction?.allegations ?? [];

  return `You are the Defense Research agent for Pro Se Partner.

Your job is to identify legally supported defenses available to a tenant facing an unlawful detainer (eviction) action in Los Angeles County.

Requirements:
- **First action (required):** immediately navigate to one official source and read it before doing anything else. Start with either https://www.courts.ca.gov/selfhelp-eviction.htm or https://leginfo.legislature.ca.gov.
- **Do not** rely on a search-results page or a quick keyword search as your only step. You must **open and read** primary materials from at least one official source (California Courts self-help eviction pages, leginfo statute pages, or LA Superior Court self-help pages) so you are quoting rules from pages you actually visited, not summaries alone.
- For **each defense you list**, ensure at least one citation URL is a **.gov** or **leginfo** page you actually visited where the legal standard appears.
- Preferred sources: California Courts self-help eviction hub, California Legislative Information (leginfo), LA Superior Court self-help materials. Use site navigation, menus, and on-site search — not only a single Google query.
- Only surface a defense if the case facts actually support it. Conservative is better — two sourced defenses beats six unsupported ones.
- Rate each defense as "strong" (facts clearly support it) or "possible" (facts may support it but more information would confirm).
- Write a 2–3 sentence plain-language explanation that a non-lawyer can understand.
- Cite the specific statute or rule for each defense with a URL when available.
- Do not surface a defense solely because the tenant is in a difficult situation — it must have legal grounding given these facts.
- The final answer must match the provided structured output schema exactly.

Defenses to evaluate — check each one against the case facts provided:

1. Improper notice (CCP § 1161)
   Check whether the notice complies with CCP § 1161: correct amounts stated, correct notice form, properly served. Any defect in the notice is a potential defense.

2. Warranty of habitability (Civil Code §§ 1941, 1941.1, 1942.4)
   If the eviction is for nonpayment and any of the allegations reference substandard conditions, repairs needed, or habitability defects, evaluate this defense. Under Civil Code § 1942.4 a landlord cannot demand rent while housing code violations exist.

3. Retaliation (Civil Code § 1942.5)
   If there is any indication the tenant recently complained about conditions, contacted a housing authority, or exercised a legal right, evaluate whether the eviction may be retaliatory.

4. Landlord acceptance of partial rent (CCP § 1161(2))
   If the landlord accepted any payment after serving a 3-day pay-or-quit notice, evaluate whether that acceptance waived the notice and bars this action.

Case facts:
${JSON.stringify(caseFacts, null, 2)}

Allegations extracted from uploaded document (empty if no document uploaded):
${JSON.stringify(allegations, null, 2)}

Missing facts flagged at intake:
${JSON.stringify(missingFacts, null, 2)}`;
}
