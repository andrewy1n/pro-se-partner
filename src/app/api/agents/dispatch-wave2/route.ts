import { NextResponse } from "next/server";
import { dispatchWave2Agent } from "@/lib/agent-dispatcher";
import { hasCachedPdf, storePdfForSession } from "@/lib/filled-ud105-cache";
import { logServerError, logServerEvent } from "@/lib/server-log";
import type { CanonicalCaseContext, DispatchWave2Response } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!process.env.BROWSER_USE_API_KEY) {
    return NextResponse.json({ error: "BROWSER_USE_API_KEY not configured" }, { status: 500 });
  }

  let body: { sessionId?: string; efilingUsername?: string; caseContext?: CanonicalCaseContext; pdfBase64?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, efilingUsername, caseContext, pdfBase64 } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  if (!efilingUsername || typeof efilingUsername !== "string") {
    return NextResponse.json({ error: "Missing efilingUsername" }, { status: 400 });
  }
  if (!caseContext || typeof caseContext !== "object") {
    return NextResponse.json({ error: "Missing caseContext" }, { status: 400 });
  }

  // Store PDF from client if provided (avoids race condition / server restart cache loss)
  if (pdfBase64 && typeof pdfBase64 === "string") {
    storePdfForSession(sessionId, Buffer.from(pdfBase64, "base64"));
    logServerEvent("dispatch_wave2_pdf_from_client", { appSessionId: sessionId });
  }

  // Determine the filled PDF URL if the server has cached it
  let filledPdfUrl: string | null = null;
  if (hasCachedPdf(sessionId)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    filledPdfUrl = `${baseUrl}/api/sessions/${sessionId}/filled-ud105`;
    logServerEvent("dispatch_wave2_pdf_cache_hit", { appSessionId: sessionId });
  } else {
    logServerEvent("dispatch_wave2_pdf_cache_miss", { appSessionId: sessionId });
  }

  try {
    const result = await dispatchWave2Agent({
      sessionId,
      efilingUsername,
      filledPdfUrl,
      caseContext,
    });

    const response: DispatchWave2Response = {
      efilingSession: result.efilingSession,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to dispatch Wave 2 agent";
    logServerError("dispatch_wave2_failed", err, { appSessionId: sessionId });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
