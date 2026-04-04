import { z } from "zod";
import type { CaseFacts, DeadlineResult, ParsedDocumentFields } from "@/lib/types";

const deadlineCitationSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().nullable().optional(),
});

export const deadlineResultSchema = z.object({
  status: z.enum(["ready", "needs_input", "error"]),
  responseDeadline: z.string().nullable(),
  consequenceSummary: z.string().nullable(),
  projectedTrialWindow: z.string().nullable(),
  citations: z.array(deadlineCitationSchema).max(6),
  missingFacts: z.array(z.string()).default([]),
  explanation: z.string().nullable(),
});

export const DEADLINE_RESULT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "responseDeadline",
    "consequenceSummary",
    "projectedTrialWindow",
    "citations",
    "missingFacts",
    "explanation",
  ],
  properties: {
    status: {
      type: "string",
      enum: ["ready", "needs_input", "error"],
    },
    responseDeadline: {
      type: ["string", "null"],
      description: "ISO date if known, otherwise null.",
    },
    consequenceSummary: {
      type: ["string", "null"],
    },
    projectedTrialWindow: {
      type: ["string", "null"],
    },
    citations: {
      type: "array",
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
    missingFacts: {
      type: "array",
      items: { type: "string" },
    },
    explanation: {
      type: ["string", "null"],
    },
  },
} as const;

export function parseDeadlineResult(value: unknown): DeadlineResult | null {
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

  const parsed = deadlineResultSchema.safeParse(candidate);
  if (!parsed.success) return null;

  return {
    status: parsed.data.status,
    responseDeadline: parsed.data.responseDeadline,
    consequenceSummary: parsed.data.consequenceSummary,
    projectedTrialWindow: parsed.data.projectedTrialWindow,
    citations: parsed.data.citations.map((citation) =>
      citation.url
        ? { title: citation.title, url: citation.url }
        : { title: citation.title },
    ),
    missingFacts: parsed.data.missingFacts,
    explanation: parsed.data.explanation,
  };
}

export function buildDeadlineTrackerTask(input: {
  caseFacts: CaseFacts;
  parsedDocumentFields: ParsedDocumentFields | null;
}): string {
  return `You are the Deadline Tracker agent for Pro Se Partner.

Your job is to determine the tenant's unlawful detainer answer deadline for an LA County eviction matter by navigating live official sources with Browser Use.

Requirements:
- Use browser navigation to verify the governing rules in official California sources before giving an answer.
- Prefer official sources such as California legislative / judicial sources and LA Superior Court materials.
- Cross-check the answer against CCP 1167 and LA Superior Court Local Rule 3.350.
- Account for the provided service method when calculating timing.
- Do not guess. If the facts are insufficient, return status "needs_input", list the missing facts, and explain what is needed.
- If you hit a conflict between sources, return status "error" and explain the conflict.
- Keep citations concise and official.
- The final answer must match the provided structured output schema exactly.

Case facts:
${JSON.stringify(input.caseFacts, null, 2)}

Parsed document fields:
${JSON.stringify(input.parsedDocumentFields, null, 2)}

Additional guidance:
- Treat serviceDate as the best available service-date anchor from intake.
- If the matter is not yet at summons-and-complaint service, explain that clearly instead of fabricating an answer deadline.
- If the service method is unknown, return needs_input instead of assuming personal service.`;
}
