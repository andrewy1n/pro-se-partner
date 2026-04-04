import { NextResponse } from "next/server";
import { parseDocumentFromUpload } from "@/lib/document-parser";
import type { ParsedDocumentFields } from "@/lib/types";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function logDocumentParse(payload: {
  fileName: string;
  mimeType: string;
  byteLength: number;
  result: ParsedDocumentFields;
}) {
  console.log(
    JSON.stringify({
      event: "document_parse",
      at: new Date().toISOString(),
      ...payload,
    }),
  );
}

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured for document parsing. Set GOOGLE_GENERATIVE_AI_API_KEY (see .env.example).",
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

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Expected form field "file" (File)' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File must be at most ${MAX_FILE_BYTES} bytes` },
      { status: 400 },
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${mimeType}. Use PDF, plain text, or a common image format.`,
      },
      { status: 400 },
    );
  }

  const ab = await file.arrayBuffer();
  const buffer = Buffer.from(ab);

  try {
    const parsedDocumentFields = await parseDocumentFromUpload({
      buffer,
      mimeType,
      fileName: file.name || "upload",
    });

    logDocumentParse({
      fileName: file.name || "upload",
      mimeType,
      byteLength: buffer.length,
      result: parsedDocumentFields,
    });

    return NextResponse.json({ parsedDocumentFields });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Document parsing failed";
    console.error(
      JSON.stringify({
        event: "document_parse_error",
        at: new Date().toISOString(),
        message,
      }),
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
