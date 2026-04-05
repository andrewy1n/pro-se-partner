/**
 * In-process limiter for concurrent Browser Use sessions (default 3).
 *
 * Each serverless instance tracks its own slots; under load, multiple Vercel
 * instances can each run up to the max, so account-wide concurrency may exceed
 * this number unless you add a distributed limiter (e.g. Redis).
 */

import { logServerEvent } from "@/lib/server-log";

const DEFAULT_MAX = 3;
const MAX_CAP = 100;

/** Matches terminal handling in session stream route. */
export const BROWSER_SESSION_TERMINAL_STATUSES = new Set([
  "idle",
  "stopped",
  "timed_out",
  "error",
]);

function parseMaxConcurrent(): number {
  const raw = process.env.BROWSER_USE_MAX_CONCURRENT?.trim();
  if (!raw) return DEFAULT_MAX;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX;
  return Math.min(n, MAX_CAP);
}

const maxConcurrent = parseMaxConcurrent();

let activeSlots = 0;
const waitQueue: Array<() => void> = [];
/** Session ids created via createBrowserTaskSession while holding a slot. */
const trackedSessionIds = new Set<string>();

function wakeOne(): void {
  const next = waitQueue.shift();
  if (next) next();
}

/**
 * Blocks until fewer than maxConcurrent Browser Use sessions are in flight
 * from this process. Call before sessions.create; pair with register on
 * success or releaseAfterCreateFailed on error.
 */
export async function acquireBrowserSessionSlot(): Promise<void> {
  if (activeSlots < maxConcurrent) {
    activeSlots++;
    return;
  }

  await new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeSlots++;
      resolve();
    });
  });
}

export function releaseBrowserSessionSlotIfFailed(): void {
  activeSlots--;
  wakeOne();
}

export function registerBrowserSessionSlot(sessionId: string): void {
  trackedSessionIds.add(sessionId);
}

/**
 * When a tracked session reaches a terminal status, release one slot (once).
 */
export function finalizeBrowserSessionSlotIfTerminal(
  sessionId: string,
  status: string,
): void {
  if (!BROWSER_SESSION_TERMINAL_STATUSES.has(status)) return;
  if (!trackedSessionIds.has(sessionId)) return;
  trackedSessionIds.delete(sessionId);
  activeSlots--;
  logServerEvent("browser_session_slot_released", { sessionId, status });
  wakeOne();
}

/** For server-side slot release polling (breaks dispatch deadlock when waiters need terminal release). */
export function getTrackedBrowserSessionSlotIds(): string[] {
  return [...trackedSessionIds];
}

export function waitQueueLengthForSlots(): number {
  return waitQueue.length;
}
