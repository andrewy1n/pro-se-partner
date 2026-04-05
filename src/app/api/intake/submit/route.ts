import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { orchestrateUnifiedIntake } from "@/lib/intake-orchestrator";
import { logServerError, logServerEvent } from "@/lib/server-log";
import type { IntakeSubmitResponse } from "@/lib/types";

export const runtime = "nodejs";

const MAX_SUMMARY_LENGTH = 24_000;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured for AI intake. Set GOOGLE_GENERATIVE_AI_API_KEY (see .env.example).",
      },
      { status: 503 },
    );
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const rawSummary = formData.get("caseSummary");
  if (typeof rawSummary !== "string") {
    return NextResponse.json({ error: 'Expected form field "caseSummary" (string)' }, { status: 400 });
  }

  const caseSummary = rawSummary.trim();
  if (!caseSummary) {
    return NextResponse.json({ error: "caseSummary must not be empty" }, { status: 400 });
  }
  if (caseSummary.length > MAX_SUMMARY_LENGTH) {
    return NextResponse.json(
      { error: `caseSummary must be at most ${MAX_SUMMARY_LENGTH} characters` },
      { status: 400 },
    );
  }

  const rawFile = formData.get("file");
  const uploadedFile = rawFile instanceof File ? rawFile : null;
  if (uploadedFile?.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (uploadedFile && uploadedFile.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File must be at most ${MAX_FILE_BYTES} bytes` },
      { status: 400 },
    );
  }

  const mimeType = uploadedFile?.type || "application/octet-stream";
  if (uploadedFile && !ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${mimeType}. Use PDF, plain text, or a common image format.`,
      },
      { status: 400 },
    );
  }

  try {
    const sessionId = randomUUID();
    const fileInput = uploadedFile
      ? {
          buffer: Buffer.from(await uploadedFile.arrayBuffer()),
          mimeType,
          fileName: uploadedFile.name || "upload",
        }
      : null;

    const caseContext = await orchestrateUnifiedIntake({
      caseSummary,
      uploadedFile: fileInput,
    });
    logServerEvent("intake_submit", {
      sessionId,
      caseSummaryLength: caseSummary.length,
      hasUpload: Boolean(fileInput),
      caseFacts: caseContext.caseFacts,
      missingFacts: caseContext.missingFacts,
      needsHumanReview: caseContext.needsHumanReview,
    });

    const response: IntakeSubmitResponse = {
      sessionId,
      caseContext,
      deadlineTrackerSession: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unified intake failed";
    logServerError("intake_submit_error", err, {
      stage: "unified_intake_or_wave1",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
