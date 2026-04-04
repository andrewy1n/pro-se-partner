import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { classifyIntake } from "@/lib/intake-classifier";

export const runtime = "nodejs";

const MAX_SUMMARY_LENGTH = 24_000;

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

  try {
    const sessionId = randomUUID();
    const result = await classifyIntake(caseSummary);
    return NextResponse.json({
      sessionId,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
