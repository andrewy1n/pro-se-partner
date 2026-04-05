import { z } from "zod";
import type { CanonicalCaseContext, FormsNavigatorResult } from "@/lib/types";

const downloadedFormSchema = z.object({
  formTitleVerified: z.string().min(1),
  revisionLabel: z.string().nullable(),
  fileName: z.string().min(1),
  /** Base64-encoded PDF bytes from the downloaded file. Required for the PDF Filler step. */
  pdfBase64: z.string().min(1),
});

export const formsNavigatorResultSchema = z.object({
  ud105: downloadedFormSchema.nullable(),
  fw001: downloadedFormSchema.nullable().optional(),
  notes: z.array(z.string()).default([]),
});

export const FORMS_NAVIGATOR_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ud105", "notes"],
  properties: {
    ud105: {
      oneOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: [
            "formTitleVerified",
            "revisionLabel",
            "fileName",
            "pdfBase64",
          ],
          properties: {
            formTitleVerified: { type: "string" },
            revisionLabel: { type: ["string", "null"] },
            fileName: { type: "string" },
            pdfBase64: { type: "string" },
          },
        },
      ],
    },
    fw001: {
      oneOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: [
            "formTitleVerified",
            "revisionLabel",
            "fileName",
            "pdfBase64",
          ],
          properties: {
            formTitleVerified: { type: "string" },
            revisionLabel: { type: ["string", "null"] },
            fileName: { type: "string" },
            pdfBase64: { type: "string" },
          },
        },
      ],
    },
    notes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export function parseFormsNavigatorResult(value: unknown): FormsNavigatorResult | null {
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

  const parsed = formsNavigatorResultSchema.safeParse(candidate);
  if (!parsed.success) return null;

  return parsed.data;
}

export function buildFormsNavigatorTask(input: {
  caseContext: CanonicalCaseContext;
  appSessionId: string;
}): string {
  return `You are the Forms Navigator agent for Pro Se Partner (LA County unlawful detainer / eviction defense).

## Rules (critical)
- Use Browser Use **only** to navigate official LA Superior Court and other **official court / government** web sources.
- **Do not** open the downloaded PDF in the browser viewer and **do not** type into any PDF viewer or form fields. Discovery and download only.
- Prefer lacourt.org and official California court self-help sources.

## Task order
1. Find the current **UD-105** (Unlawful Detainer Answer) form first. Verify the **form title** and **revision/date** shown on the official page before downloading.
2. Optionally, if time permits, locate **FW-001** (fee waiver) second — same verification rules.
3. Download the official PDF file(s) through the browser (court site). Do not fabricate PDFs.

## Output
- Return the structured JSON schema exactly. For each downloaded form, include **pdfBase64** with the raw PDF bytes Base64-encoded so downstream processing can fill fields offline.
- If you cannot obtain a form, set that form key to null and explain in **notes**.

## Case context (for search hints only)
${JSON.stringify(input.caseContext.caseFacts, null, 2)}

Parsed document fields (if any):
${JSON.stringify(input.caseContext.parsedDocumentFields?.normalizedExtraction ?? null, null, 2)}

Internal tracking id: ${input.appSessionId}`;
}
