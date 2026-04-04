import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { normalizeAndValidateDocument } from "@/lib/document-parse-normalize";
import type { LlmRawDocumentFields, ParsedDocumentFields } from "@/lib/types";

export const DEFAULT_DOCUMENT_PARSER_MODEL = "gemini-2.5-flash";

const allegationList = z.array(z.string());

const llmRawSchema = z.object({
  plaintiffNameFromPlaintiffLabel: z.string().nullable(),
  defendantNameFromDefendantLabel: z.string().nullable(),
  landlordNameFromDocument: z.string().nullable(),
  caseNumber: z.string().nullable(),
  courtName: z.string().nullable(),
  claimedAmount: z.number().nullable(),
  noticeTypeFromDocument: z.string().nullable(),
  noticeServiceDate: z.string().nullable(),
  noticeExpirationDate: z.string().nullable(),
  serviceMethod: z.string().nullable(),
  propertyAddress: z.string().nullable(),
  tenancyAllegations: allegationList,
  noticeAllegations: allegationList,
  serviceAllegations: allegationList,
  rentalAssistanceAllegations: allegationList,
  reliefRequested: allegationList,
  plaintiffOccurrences: z.array(z.string()),
  defendantOccurrences: z.array(z.string()),
  signatureOrPrintedName: z.string().nullable(),
  documentHeaderOrTitleLine: z.string().nullable(),
  documentTypeGuess: z.string().nullable(),
  proceedingStageGuess: z.string().nullable(),
});

const SYSTEM = `You are the Document Parser for Pro Se Partner (eviction defense, Los Angeles County).

Extract structured fields from the uploaded document. Paying parties may have unexpected real names in demos — never "correct" or substitute names you think are more plausible.

## Party names (strict)
- Fill plaintiffNameFromPlaintiffLabel ONLY from text explicitly tied to a PLAINTIFF label (e.g. a line "PLAINTIFF:" or "Plaintiff:" and the name on that labeled line or immediately following it).
- Fill defendantNameFromDefendantLabel ONLY from text explicitly tied to a DEFENDANT label the same way.
- Do NOT infer plaintiff or defendant from signature blocks, notary sections, or "nearest name on the page" unless that name is clearly on the labeled party line.
- If a label is missing, use null — do not guess from context.

## Landlord
- Fill landlordNameFromDocument ONLY if the document explicitly identifies a landlord (e.g. labeled "Landlord") — not from signatures. Otherwise null.

## Occurrences (for validation only)
- plaintiffOccurrences: every distinct plaintiff string as it appears next to each PLAINTIFF label (multiple pages OK). Empty array if a single labeled line.
- defendantOccurrences: same for DEFENDANT.

## Allegations — California Judicial Council form UD-100 (Complaint—Unlawful Detainer)

Do **not** summarize the complaint into a few short phrases. Do **not** reduce extraction to only the "prayer for relief" or judgment request lines.

### Sources
- Build allegations from the **numbered sections / paragraphs** of the complaint body (e.g. items 6, 7, 9, 10, 11, 13, 14, 20 and any other numbered items when present).
- Include **every checked box, filled blank, and affirmative statement** that constitutes a material fact or procedural assertion.
- Omit nothing that appears as an operative allegation in those sections: if the form states it, capture it.

### Granularity
- **One meaningful assertion per string** — do not merge unrelated facts (e.g. rent amount and due date should be separate items when stated separately).
- Preserve factual detail (amounts, dates, "month-to-month", "payable on the first", service method names, etc.).

### Categories (place each string in exactly one list)
1. **tenancyAllegations** — Lease/tenancy facts: agreement to rent, parties to the agreement, rent amount and periodicity, due date, tenancy type (e.g. month-to-month), whether Tenant Protection Act applies or is alleged not to apply, fair rental value per day if stated, premises description if stated as an allegation (not caption-only).
2. **noticeAllegations** — The statutory or 3-day notice: type of notice, what it demanded, election of forfeiture if stated, that facts in the notice are alleged true, failure to comply, amount due at time of notice if stated as a notice allegation.
3. **serviceAllegations** — How notice was served, **dates** of service and **expiration** of notice period, personal vs substituted service, compliance deadlines.
4. **rentalAssistanceAllegations** — Rental assistance / COVID-era or related certifications: whether plaintiff has not received assistance, whether assistance is pending, statutory declarations tied to those checkboxes (when present).
5. **reliefRequested** — **Prayer for relief** only: possession, costs of suit, past-due rent / damages amounts requested, any other specific relief asked (e.g. daily rental value as part of judgment if framed as requested relief).

### Distinction
- Factual story of what happened → tenancy (and sometimes split with notice if the notice content is duplicated as a freestanding allegation—prefer noticeAllegations for notice-specific statements).
- Notice document + compliance → notice + service lists as appropriate.
- What the plaintiff wants the court to order → reliefRequested.

### Non–UD-100 documents
- Use the same category ideas when analogous; otherwise use best-effort grouping and leave unused lists empty.

## Other fields
- documentHeaderOrTitleLine: the main title or caption at the top (e.g. form title), verbatim enough to detect form type.
- Dates as ISO 8601 (YYYY-MM-DD) or null.
- claimedAmount: number in dollars or null (may overlap with relief—still extract top-line amount if clearly stated).
- signatureOrPrintedName: name next to a signature line if visible (may differ from plaintiff — we validate separately).
- documentTypeGuess / proceedingStageGuess: your best guess from the document; proceedingStageGuess uses snake_case values like notice_served, complaint_filed when clearly supported by the document (not for UD complaint — see server rules).

## Pay stubs
- For pay stubs, use nulls for court case fields; fill only what is clearly present. Leave allegation lists empty.`;

export interface ParseDocumentInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

function toRawExtractionRecord(raw: LlmRawDocumentFields): Record<string, unknown> {
  return { ...raw } as Record<string, unknown>;
}

export async function parseDocumentFromUpload(
  input: ParseDocumentInput,
): Promise<ParsedDocumentFields> {
  const modelId =
    process.env.DOCUMENT_PARSER_MODEL?.trim() || DEFAULT_DOCUMENT_PARSER_MODEL;

  const textOnlyMime =
    input.mimeType === "text/plain" || input.mimeType === "text/markdown";

  const userText = `File name: ${input.fileName}

Extract structured fields from this document.`;

  const { output } = await generateText({
    model: google(modelId),
    temperature: 0,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: textOnlyMime
          ? [
              { type: "text", text: `${userText}\n\n---\n\n${input.buffer.toString("utf-8")}` },
            ]
          : [
              { type: "text", text: userText },
              {
                type: "file",
                data: input.buffer,
                mediaType: input.mimeType,
                filename: input.fileName,
              },
            ],
      },
    ],
    output: Output.object({
      schema: llmRawSchema,
    }),
  });

  if (!output) {
    throw new Error("Document parsing produced no structured output");
  }

  const { normalizedExtraction, validationWarnings } = normalizeAndValidateDocument(output);

  return {
    validationWarnings,
    rawExtraction: toRawExtractionRecord(output),
    normalizedExtraction,
  };
}
