import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  DEFAULT_DOCUMENT_PARSER_MODEL,
  DOCUMENT_PARSER_SYSTEM,
  createEmptyRawDocumentFields,
  llmRawSchema,
  toParsedDocumentFields,
} from "@/lib/document-parser";
import { buildCanonicalCaseContext } from "@/lib/document-parse-normalize";
import {
  DEFAULT_INTAKE_MODEL,
  INTAKE_CLASSIFIER_SYSTEM,
  intakeObjectSchema,
  structuredToCaseFacts,
} from "@/lib/intake-classifier";
import type { CanonicalCaseContext } from "@/lib/types";

const unifiedIntakeSchema = z.object({
  intake: intakeObjectSchema,
  document: llmRawSchema.nullable(),
});

export interface UploadedIntakeFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface UnifiedIntakeInput {
  caseSummary: string;
  uploadedFile?: UploadedIntakeFile | null;
}

export const DEFAULT_UNIFIED_INTAKE_MODEL = DEFAULT_INTAKE_MODEL;

const UNIFIED_INTAKE_SYSTEM = `You are the unified intake orchestrator for Pro Se Partner.

Your job is to analyze the user's narrative and optional uploaded document in one pass, then return structured JSON with two separate sections:
- intake: facts extracted from the user's plain-language description
- document: facts extracted only from the uploaded document, or null when no document is provided

Do not silently merge text and document evidence in the model output. Keep them separate so the server can reconcile them deterministically.

## Intake extraction rules
${INTAKE_CLASSIFIER_SYSTEM}

## Document extraction rules
${DOCUMENT_PARSER_SYSTEM}

## Cross-source rules
- If no uploaded document is provided, return document: null.
- If a document is provided but has little or no extractable case data, still return the document object with null scalar fields and empty allegation arrays instead of guessing.
- Never copy a fact from the user's narrative into the document object unless it is visible in the document itself.
- Never copy a fact from the uploaded document into the intake object unless it is stated in the user narrative.
- If the sources disagree, preserve the disagreement by keeping each section faithful to its own source.`;

function getUnifiedIntakeModel(): string {
  return (
    process.env.UNIFIED_INTAKE_MODEL?.trim() ||
    process.env.INTAKE_CLASSIFICATION_MODEL?.trim() ||
    process.env.DOCUMENT_PARSER_MODEL?.trim() ||
    DEFAULT_UNIFIED_INTAKE_MODEL ||
    DEFAULT_DOCUMENT_PARSER_MODEL
  );
}

export async function orchestrateUnifiedIntake(
  input: UnifiedIntakeInput,
): Promise<CanonicalCaseContext> {
  const uploadedFile = input.uploadedFile ?? null;
  const textOnlyMime =
    uploadedFile?.mimeType === "text/plain" || uploadedFile?.mimeType === "text/markdown";

  const userContent = uploadedFile
    ? textOnlyMime
      ? [
          {
            type: "text" as const,
            text:
              `User intake:\n${input.caseSummary}\n\nUploaded file name: ${uploadedFile.fileName}\n\n` +
              `Document contents:\n${uploadedFile.buffer.toString("utf-8")}`,
          },
        ]
      : [
          {
            type: "text" as const,
            text:
              `User intake:\n${input.caseSummary}\n\nUploaded file name: ${uploadedFile.fileName}\n` +
              "A document is attached. Extract the intake object from the user narrative only and the document object from the attachment only.",
          },
          {
            type: "file" as const,
            data: uploadedFile.buffer,
            mediaType: uploadedFile.mimeType,
            filename: uploadedFile.fileName,
          },
        ]
    : [
        {
          type: "text" as const,
          text:
            `User intake:\n${input.caseSummary}\n\n` +
            "No uploaded document was provided. Return document as null.",
        },
      ];

  const { output } = await generateText({
    model: google(getUnifiedIntakeModel()),
    temperature: 0,
    system: UNIFIED_INTAKE_SYSTEM,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    output: Output.object({
      schema: unifiedIntakeSchema,
    }),
  });

  if (!output) {
    throw new Error("Unified intake produced no structured output");
  }

  const rawDocument = uploadedFile
    ? output.document ?? createEmptyRawDocumentFields()
    : null;
  const parsedDocumentFields = rawDocument ? toParsedDocumentFields(rawDocument) : null;

  return buildCanonicalCaseContext({
    caseFacts: structuredToCaseFacts(output.intake),
    confidence: output.intake.confidence,
    missingFacts: output.intake.missingFields,
    needsHumanReview: output.intake.needsHumanReview,
    parsedDocumentFields,
    uploadedFileName: uploadedFile?.fileName ?? null,
    documentParseError: null,
  });
}
