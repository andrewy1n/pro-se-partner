/** Intake classifier enum values for `CaseFacts.noticeType`. */
export const NOTICE_TYPE_INTAKE_SLUGS = [
  "3_day_pay_or_quit",
  "3_day_cure_or_quit",
  "30_day",
  "60_day",
  "summons_complaint",
] as const;

export type NoticeTypeIntakeSlug = (typeof NOTICE_TYPE_INTAKE_SLUGS)[number];

const SLUG_SET = new Set<string>(NOTICE_TYPE_INTAKE_SLUGS);

function normalizeForMatch(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Maps free-text document phrases (or slight slug variants) to intake `noticeType` slugs.
 * Returns null when no mapping is known (caller may keep the raw string).
 */
export function normalizeNoticeTypeToIntakeSlug(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;

  const asUnderscore = t.toLowerCase().replace(/\s+/g, "_");
  if (SLUG_SET.has(asUnderscore)) {
    return asUnderscore;
  }

  const n = normalizeForMatch(t);

  if (/\b60\s*day\b/.test(n) || /\bsixty\s*day\b/.test(n)) return "60_day";
  if (/\b30\s*day\b/.test(n) || /\bthirty\s*day\b/.test(n)) return "30_day";

  const isThreeDay =
    /\b3\s*day\b/.test(n) ||
    /\bthree\s*day\b/.test(n) ||
    /\b3\s*[\s-]*day\b/.test(n);

  if (isThreeDay) {
    if (
      /\bcure\b/.test(n) ||
      /\bperform\b/.test(n) ||
      /\bcovenant\b/.test(n)
    ) {
      return "3_day_cure_or_quit";
    }
    if (
      (/\bpay\b/.test(n) && /\bquit\b/.test(n)) ||
      (/\bpay\b/.test(n) && /\brent\b/.test(n)) ||
      /\bpay\s+or\s+quit\b/.test(n) ||
      /\bnon[\s-]*payment\b/.test(n) ||
      /\bnonpayment\b/.test(n)
    ) {
      return "3_day_pay_or_quit";
    }
  }

  if (
    (/\bsummons\b/.test(n) && /\bcomplaint\b/.test(n)) ||
    /\bunlawful\s+detainer\s+complaint\b/.test(n) ||
    /\bud[\s-]*100\b/i.test(n)
  ) {
    return "summons_complaint";
  }

  return null;
}

export function noticeTypesEquivalent(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const sa = String(a).trim();
  const sb = String(b).trim();
  if (!sa || !sb) return sa === sb;
  const na = normalizeNoticeTypeToIntakeSlug(sa);
  const nb = normalizeNoticeTypeToIntakeSlug(sb);
  if (na != null && nb != null && na === nb) return true;
  return false;
}
