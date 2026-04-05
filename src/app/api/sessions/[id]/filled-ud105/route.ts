import { getCachedPdf, storePdfForSession } from "@/lib/filled-ud105-cache";
import { logServerEvent } from "@/lib/server-log";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const buf = getCachedPdf(id);
  if (!buf) {
    return new Response("PDF not found", { status: 404 });
  }
  logServerEvent("filled_ud105_served", { appSessionId: id, bytes: buf.byteLength });
  return new Response(buf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="UD-105-filled.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let body: { pdfBase64?: string };
  try {
    body = (await request.json()) as { pdfBase64?: string };
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!body.pdfBase64 || typeof body.pdfBase64 !== "string") {
    return new Response("Missing pdfBase64", { status: 400 });
  }

  const buf = Buffer.from(body.pdfBase64, "base64");
  storePdfForSession(id, buf);
  logServerEvent("filled_ud105_stored", { appSessionId: id, bytes: buf.byteLength });

  return new Response(null, { status: 204 });
}
