import { NextResponse } from "next/server";
import { dispatchFormsNavigator } from "@/lib/agent-dispatcher";
import { logServerError } from "@/lib/server-log";
import type { CanonicalCaseContext } from "@/lib/types";

export const runtime = "nodejs";

function parseCaseContext(body: unknown): CanonicalCaseContext {
  if (!body || typeof body !== "object") {
    throw new Error('Expected JSON body with "caseContext"');
  }
  const ctx = (body as { caseContext?: unknown }).caseContext;
  if (!ctx || typeof ctx !== "object" || !("caseFacts" in ctx)) {
    throw new Error("caseContext.caseFacts is required");
  }
  return ctx as CanonicalCaseContext;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing app session id" }, { status: 400 });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const caseContext = parseCaseContext(body);
    const handle = await dispatchFormsNavigator({
      appSessionId: id,
      caseContext,
    });
    return NextResponse.json(handle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start Forms Navigator";
    logServerError("run_forms_navigator_failed", err, { appSessionId: id });
    const status = message.includes("caseContext") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
