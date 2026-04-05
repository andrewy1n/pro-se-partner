/** Shared visual urgency for deadline display (ISO date string or null). */

export type DeadlineUrgency = "pending" | "passed" | "urgent" | "calm";

export function getDeadlineUrgency(responseDeadlineIso: string | null): DeadlineUrgency {
  if (!responseDeadlineIso || responseDeadlineIso === "TBD") return "pending";
  const deadline = new Date(responseDeadlineIso);
  if (Number.isNaN(deadline.getTime())) return "pending";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "passed";
  if (days <= 7) return "urgent";
  return "calm";
}
