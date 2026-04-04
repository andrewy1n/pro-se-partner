import type { IntakeSessionPayload } from "@/lib/types";

export const INTAKE_STORAGE_KEY_PREFIX = "pro-se-partner:intake:";

export function intakeStorageKey(sessionId: string): string {
  return `${INTAKE_STORAGE_KEY_PREFIX}${sessionId}`;
}

export function parseIntakeSessionPayload(raw: string): IntakeSessionPayload | null {
  try {
    const v = JSON.parse(raw) as IntakeSessionPayload;
    if (!v?.caseFacts || typeof v.caseFacts !== "object") return null;
    if (!("deadlineTrackerSession" in v)) return null;
    return v;
  } catch {
    return null;
  }
}
