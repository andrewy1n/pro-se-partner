import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  classifyIntake,
  DEFAULT_INTAKE_MODEL,
} from "@/lib/intake-classifier";
import { dispatchWave1Agents } from "@/lib/agent-dispatcher";
import { logServerError, logServerEvent } from "@/lib/server-log";
import type { CaseFacts } from "@/lib/types";

export const runtime = "nodejs";

const MAX_SUMMARY_LENGTH = 24_000;

function logIntakeClassification(payload: {
  sessionId: string;
  model: string;
  caseSummaryLength: number;
  caseFacts: CaseFacts;
  confidence: number;
  missingFields: string[];
  needsHumanReview: boolean;
  browserSessionId: string;
  browserSessionStatus: string;
}) {
  logServerEvent("intake_classification", payload);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("caseSummary" in body) ||
    typeof (body as { caseSummary: unknown }).caseSummary !== "string"
  ) {
    return NextResponse.json(
      { error: "Expected { caseSummary: string }" },
      { status: 400 },
    );
  }

  const caseSummary = (body as { caseSummary: string }).caseSummary.trim();
  if (!caseSummary) {
    return NextResponse.json(
      { error: "caseSummary must not be empty" },
      { status: 400 },
    );
  }
  if (caseSummary.length > MAX_SUMMARY_LENGTH) {
    return NextResponse.json(
      { error: `caseSummary must be at most ${MAX_SUMMARY_LENGTH} characters` },
      { status: 400 },
    );
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured for AI classification. Set GOOGLE_GENERATIVE_AI_API_KEY (see .env.example).",
      },
      { status: 503 },
    );
  }
  if (!process.env.BROWSER_USE_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured for Browser Use. Set BROWSER_USE_API_KEY (see .env.local).",
      },
      { status: 503 },
    );
  }

  try {
    const sessionId = randomUUID();
    const result = await classifyIntake(caseSummary);
    const model =
      process.env.INTAKE_CLASSIFICATION_MODEL?.trim() || DEFAULT_INTAKE_MODEL;
    const wave1 = await dispatchWave1Agents({
      appSessionId: sessionId,
      caseFacts: result.caseFacts,
      parsedDocumentFields: null,
    });

    logIntakeClassification({
      sessionId,
      model,
      caseSummaryLength: caseSummary.length,
      caseFacts: result.caseFacts,
      confidence: result.confidence,
      missingFields: result.missingFields,
      needsHumanReview: result.needsHumanReview,
      browserSessionId: wave1.deadlineTrackerSession.sessionId,
      browserSessionStatus: wave1.deadlineTrackerSession.status,
    });

    return NextResponse.json({
      sessionId,
      ...result,
      deadlineTrackerSession: wave1.deadlineTrackerSession,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Classification failed";
    logServerError("intake_classification_error", err, {
      stage: "classify_or_wave1",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
