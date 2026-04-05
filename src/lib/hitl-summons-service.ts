import type { CanonicalCaseContext } from "@/lib/types";

/** Plaintiff verification date on UD-100 (ISO), when extracted from the document. */
export function getComplaintReferenceDateIso(
  ctx: CanonicalCaseContext | null | undefined,
): string | null {
  const d = ctx?.parsedDocumentFields?.normalizedExtraction?.complaintVerifiedDate;
  if (typeof d !== "string") return null;
  const t = d.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

export function formatIsoDateForDisplay(iso: string): string {
  const t = iso.trim().slice(0, 10);
  const [y, m, d] = t.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** True when missing-fact keys suggest we should show Summons vs. notice copy. */
export function hitlFactsNeedSummonsDateClarification(missingFacts: string[]): boolean {
  for (const f of missingFacts) {
    const n = f.toLowerCase();
    if (n === "service_date" || n === "servicedate") return true;
    if (n.includes("summons") && n.includes("date")) return true;
    if (n.includes("service") && n.includes("date") && !n.includes("method")) return true;
  }
  return false;
}

export function buildSummonsServiceHitlInstruction(
  ctx: CanonicalCaseContext,
  mode: "pre-dispatch" | "post-agent",
): string {
  const ref = getComplaintReferenceDateIso(ctx);
  const datePart = ref
    ? `After the lawsuit was filed on ${formatIsoDateForDisplay(ref)}, `
    : "After the lawsuit was filed, ";
  const core = `${datePart}when were you physically handed the court papers (the Summons and Complaint)? This is a different date from when you received the pay-or-quit or other eviction notice (for example, the date often shown near UD-100 item 10(a) for the 3-day notice).`;

  if (mode === "pre-dispatch") {
    return `${core}\n\nEnter the date and how you were served below.`;
  }
  return `${core}\n\nPlease provide the details below.`;
}

function parseLocalDate(iso: string): Date {
  const t = iso.trim().slice(0, 10);
  const [y, m, d] = t.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function validateSummonsServiceDateVsComplaint(
  serviceDateIso: string,
  complaintReferenceIso: string,
): { ok: true } | { ok: false; message: string } {
  const s = parseLocalDate(serviceDateIso);
  const c = parseLocalDate(complaintReferenceIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(c.getTime())) {
    return { ok: true };
  }
  if (s.getTime() < c.getTime()) {
    return {
      ok: false,
      message:
        "That date is before the lawsuit was filed or verified on your complaint. The Summons and Complaint could not have been served before then. Enter the date you were physically handed the court papers after the case was filed—not the date you received the pay-or-quit notice.",
    };
  }
  return { ok: true };
}
