/**
 * Client-only helpers for validating PDF blobs before Preview/Download and for
 * structured browser console logs (`[pdf-artifact]`). Search DevTools console for that prefix.
 */

/** True if bytes start with the standard %PDF signature (most normal PDFs). */
export function bytesLookLikePdf(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export function hexHead(bytes: Uint8Array, maxBytes = 16): string {
  const n = Math.min(maxBytes, bytes.length);
  return Array.from(bytes.slice(0, n))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

/**
 * Logs to the **browser** DevTools console (not the Next.js terminal).
 * Chrome/Edge: F12 or Ctrl+Shift+J → "Console" tab → type `pdf-artifact` in the filter box.
 */
export function logPdfArtifact(
  level: "info" | "warn" | "error",
  event: string,
  detail: Record<string, unknown>,
): void {
  const payload = { event, ...detail, _tag: "pdf-artifact" };
  const json = JSON.stringify(payload);
  const oneLine = `[pdf-artifact] ${event} ${json}`;
  if (level === "error") console.error(oneLine);
  else if (level === "warn") console.warn(oneLine);
  else console.log(oneLine);
}
