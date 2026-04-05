import { z } from "zod";
import type { CanonicalCaseContext, EfilingResult } from "@/lib/types";

export interface BuildEfilingTaskInput {
  appSessionId: string;
  efilingUsername: string;
  filledPdfUrl: string | null;
  caseContext: CanonicalCaseContext;
}

const efilingResultSchema = z.object({
  confirmationNumber: z.string().nullable(),
  submittedAt: z.string().nullable(),
});

export const EFILING_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["confirmationNumber", "submittedAt"],
  properties: {
    confirmationNumber: { type: ["string", "null"] },
    submittedAt: { type: ["string", "null"] },
  },
} as const;

export function parseEfilingResult(value: unknown): EfilingResult | null {
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

  const parsed = efilingResultSchema.safeParse(candidate);
  if (!parsed.success) return null;

  return {
    confirmationNumber: parsed.data.confirmationNumber,
    submittedAt: parsed.data.submittedAt,
  };
}

export function buildEfilingTask(input: BuildEfilingTaskInput): string {
  const { efilingUsername, filledPdfUrl, caseContext, appSessionId } = input;
  const { caseFacts } = caseContext;
  const jurisdiction = caseFacts.jurisdiction ?? "Los Angeles County";
  const norm = caseContext.parsedDocumentFields?.normalizedExtraction;
  const plaintiffName = norm?.plaintiffName ?? null;
  const defendantName = norm?.defendantName ?? null;
  const caseNumber = norm?.caseNumber ?? null;
  const propertyAddress = norm?.propertyAddress ?? null;

  const caseSearchDetails = [
    caseNumber ? `- Case number: ${caseNumber}` : null,
    plaintiffName ? `- Plaintiff (landlord) name: ${plaintiffName}` : null,
    defendantName ? `- Defendant (tenant) name: ${defendantName}` : null,
    propertyAddress ? `- Property address: ${propertyAddress}` : null,
  ]
    .filter(Boolean)
    .join("\n   ");

  const uploadSection = filledPdfUrl
    ? `
5. UPLOAD THE ANSWER FORM
   - A pre-filled UD-105 Answer form is available at this URL: ${filledPdfUrl}
   - Download this PDF file.
   - In the e-filing portal, locate the option to attach or upload documents.
   - Upload the downloaded UD-105 PDF as the answer document.
`
    : `
5. UPLOAD THE ANSWER FORM
   - No pre-filled form was provided. Skip the upload step and proceed to submit.
   - Note in your output that the form was not uploaded.
`;

  return `You are the E-Filing agent for Pro Se Partner. Your job is to file a tenant's Answer to an unlawful detainer (eviction) complaint through the courtfiling.net e-filing portal.

Internal tracking id: ${appSessionId}

STEP-BY-STEP INSTRUCTIONS:

1. NAVIGATE TO THE E-FILING PORTAL
   - Go to: https://courtfiling.net
   - This is the courtfiling.net e-filing portal used by LA Superior Court.

2. FILL IN THE USERNAME
   - Find the username or email field on the login page.
   - Enter this username exactly: ${efilingUsername}
   - Do NOT attempt to fill in the password field.

3. WAIT FOR THE USER TO LOG IN
   *** CRITICAL: Stop here and do nothing. ***
   The user will type their password directly in the browser you are controlling.
   Wait until you observe that the login form has disappeared and you are viewing a logged-in dashboard or case list page.
   Do not click anything, do not navigate, do not attempt to guess the password.
   Simply wait — the user is watching and will complete the login themselves.

4. FIND THE CASE AND FILE A RESPONSE
   - Once logged in, use the portal's case search (Advanced Case Search if available) to locate the case.
   - Use the following case details to search:
   ${caseSearchDetails || `- Jurisdiction: ${jurisdiction}\n   - Case type: Unlawful Detainer`}
   - Once you find the case, select the option to file a new document or response.
   - Select "Answer" (UD-105) as the document type.

${uploadSection}

6. COMPLETE AND SUBMIT THE FILING
   - Review the filing details and submit.
   - Wait for the confirmation page.

7. CAPTURE THE CONFIRMATION
   - Record the confirmation number exactly as shown.
   - Record the submission timestamp.
   - Return structured output matching the schema.

IMPORTANT NOTES:
- Do not attempt to guess or fill in the password at any point.
- If you encounter a CAPTCHA, wait — the user may need to solve it.
- If filing fails or you cannot find the confirmation number, set confirmationNumber to null and describe what happened in submittedAt.`;
}
