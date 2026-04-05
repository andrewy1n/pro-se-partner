// Module-level in-memory PDF cache.
// Shared within a single Node.js process. Suitable for hackathon/single-instance use.
// For production, replace with a shared store (Redis, S3, etc.).
const pdfCache = new Map<string, Buffer>();

export function storePdfForSession(sessionId: string, buf: Buffer): void {
  pdfCache.set(sessionId, buf);
}

export function hasCachedPdf(sessionId: string): boolean {
  return pdfCache.has(sessionId);
}

export function getCachedPdf(sessionId: string): Buffer | undefined {
  return pdfCache.get(sessionId);
}
