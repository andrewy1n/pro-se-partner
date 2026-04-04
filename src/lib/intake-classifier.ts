import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { CaseFacts } from "@/lib/types";

export const DEFAULT_INTAKE_MODEL = "gemini-2.5-flash";

const intakeObjectSchema = z.object({
  evictionType: z.enum([
    "nonpayment",
    "no_fault",
    "lease_violation",
    "holdover",
    "unknown",
  ]),
  proceedingStage: z.enum([
    "notice_served",
    "complaint_filed",
    "hearing_scheduled",
    "judgment_entered",
    "unknown",
  ]),
  noticeType: z.enum([
    "3_day_pay_or_quit",
    "3_day_cure_or_quit",
    "30_day",
    "60_day",
    "summons_complaint",
    "unknown",
  ]),
  serviceDate: z.string().nullable(),
  jurisdiction: z.string().nullable(),
  claimedAmount: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.string()),
  needsHumanReview: z.boolean(),
});

export type IntakeStructuredOutput = z.infer<typeof intakeObjectSchema>;

export interface IntakeClassificationResult {
  caseFacts: CaseFacts;
  confidence: number;
  missingFields: string[];
  needsHumanReview: boolean;
}

function structuredToCaseFacts(s: IntakeStructuredOutput): CaseFacts {
  return {
    evictionType: s.evictionType === "unknown" ? null : s.evictionType,
    proceedingStage: s.proceedingStage === "unknown" ? null : s.proceedingStage,
    noticeType: s.noticeType === "unknown" ? null : s.noticeType,
    serviceDate: s.serviceDate,
    jurisdiction: s.jurisdiction,
    claimedAmount: s.claimedAmount,
  };
}

const SYSTEM = `You are Agent 1 (Intake & Classification) for Pro Se Partner, focused on eviction defense in Los Angeles County.

Extract structured case facts from the user's plain-language description. Rules:
- Never invent dates, amounts, or court events. Use null and "unknown" when not clearly stated.
- If jurisdiction is not stated, prefer null unless the user clearly indicates LA County or Los Angeles.
- Dates must be ISO 8601 date strings (YYYY-MM-DD) or null.
- claimedAmount is dollars as a number, or null if not stated.
- confidence: your estimated probability (0-1) that the classification is correct given the text.
- missingFields: short snake_case names of important missing facts (e.g. service_date, notice_type).
- needsHumanReview: true if confidence is low or the situation is ambiguous or legally sensitive.`;

export async function classifyIntake(
  caseSummary: string,
): Promise<IntakeClassificationResult> {
  const modelId =
    process.env.INTAKE_CLASSIFICATION_MODEL ?? DEFAULT_INTAKE_MODEL;

  const { output } = await generateText({
    model: google(modelId),
    temperature: 0,
    system: SYSTEM,
    prompt: `User intake:\n${caseSummary}`,
    output: Output.object({
      schema: intakeObjectSchema,
    }),
  });

  if (!output) {
    throw new Error("Intake classification produced no structured output");
  }

  return {
    caseFacts: structuredToCaseFacts(output),
    confidence: output.confidence,
    missingFields: output.missingFields,
    needsHumanReview: output.needsHumanReview,
  };
}
