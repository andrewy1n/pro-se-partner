import type { CanonicalCaseContext } from "@/lib/types";

const ALL_DEFENSE_KEYS = [
  "defense_a",
  "defense_b",
  "defense_c",
  "defense_d",
  "defense_e",
  "defense_f",
  "defense_g",
  "defense_h",
  "defense_i",
  "defense_i1",
  "defense_i2",
  "defense_i3",
  "defense_i4",
  "defense_i5",
  "defense_j",
  "defense_k",
  "defense_k1",
  "defense_k2",
  "defense_l",
  "defense_m",
  "defense_m1",
  "defense_m2",
  "defense_m3",
  "defense_n",
  "defense_o",
  "defense_p",
  "defense_p1",
  "defense_p2",
  "defense_q",
  "defense_r",
  "defense_s",
] as const;

export type DefenseCheckboxKey = (typeof ALL_DEFENSE_KEYS)[number];

function defenseCorpus(ctx: CanonicalCaseContext): string {
  const norm = ctx.parsedDocumentFields?.normalizedExtraction;
  const cf = ctx.caseFacts;
  const chunks: string[] = [
    cf.evictionType,
    cf.proceedingStage,
    cf.noticeType,
    ...(norm?.tenancyAllegations ?? []),
    ...(norm?.noticeAllegations ?? []),
    ...(norm?.serviceAllegations ?? []),
    ...(norm?.rentalAssistanceAllegations ?? []),
    ...(norm?.reliefRequested ?? []),
    ...(norm?.allegations ?? []),
  ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);

  return chunks.join(" \n ").toLowerCase();
}

function looksLikeNonpaymentOnlyRentDefense(ctx: CanonicalCaseContext): boolean {
  const cf = ctx.caseFacts;
  const s = [cf.evictionType, cf.noticeType, cf.proceedingStage].join(" ").toLowerCase();
  if (/nonpayment|non.payment|unpaid.*rent|pay.*rent|rent.*due|3\s*day.*pay|three.day.*pay/i.test(s)) {
    return true;
  }
  const corpus = defenseCorpus(ctx);
  return /nonpayment|rent.*due|unpaid.*rent|failure.*pay.*rent/i.test(corpus);
}

function emptyDefense(): Record<DefenseCheckboxKey, boolean> {
  const o = {} as Record<DefenseCheckboxKey, boolean>;
  for (const k of ALL_DEFENSE_KEYS) o[k] = false;
  return o;
}

/**
 * Conservative defense checkbox inference. Keys match `UD105_FIELDS` checkbox names (`defense_a` … `defense_s`).
 */
export function inferDefenses(ctx: CanonicalCaseContext): Record<DefenseCheckboxKey, boolean> {
  const out = emptyDefense();
  const corpus = defenseCorpus(ctx);
  const nonpayment = looksLikeNonpaymentOnlyRentDefense(ctx);

  // Nonpayment / pay-or-quit: habitability (3a) is a common affirmative defense to review.
  if (nonpayment) {
    out.defense_a = true;
  }

  if (nonpayment && /(deduct.*rent|repair.*deduct|withhold.*rent|withheld.*rent|cost of repair)/i.test(corpus)) {
    out.defense_b = true;
  }

  if (
    nonpayment &&
    /(offer(ed)?.*rent|would not accept|refuse(d)? to accept.*rent|tender.*rent|plaintiff would not accept)/i.test(
      corpus,
    )
  ) {
    out.defense_c = true;
  }

  if (nonpayment && /(more than one year|one year ago|rent due more than|year old.*rent)/i.test(corpus)) {
    out.defense_d = true;
  }

  if (/\b(waiv|cancelled notice|changed notice|withdrawn notice)/i.test(corpus)) {
    out.defense_e = true;
  }

  if (/\b(retaliat|retaliation|complain.*(health|code)|reported.*(code|inspector))/i.test(corpus)) {
    out.defense_f = true;
  }

  if (
    /\b(discriminat|race|religion|sex|gender|disability|familial|national origin|source of income|immigration)/i.test(
      corpus,
    )
  ) {
    out.defense_g = true;
  }

  if (/\b(rent control|eviction control|just cause|ordinance|rental ordinance|local ordinance)/i.test(corpus)) {
    out.defense_h = true;
  }

  if (
    /\b(tenant protection|ab\s*1482|substantial remodel|owner.occup|ellis|wrongful eviction|no fault|1946\.2|1947\.12)/i.test(
      corpus,
    )
  ) {
    out.defense_i = true;
  }

  if (out.defense_i) {
    if (/just cause|termination.*notice|written notice to terminate/i.test(corpus)) out.defense_i1 = true;
    if (/cure|1946\.2\(c\)|lease.*violation/i.test(corpus)) out.defense_i2 = true;
    if (/relocat|1946\.2\(d\)/i.test(corpus)) out.defense_i3 = true;
    if (/raised the rent|unauthorized amount|1947\.12/i.test(corpus)) out.defense_i4 = true;
    if (/violated the tenant protection act in another manner/i.test(corpus)) out.defense_i5 = true;
  }

  if (/\b(accepted rent|rent.*after.*notice|after.*notice.*expired)/i.test(corpus)) {
    out.defense_j = true;
  }

  if (
    /\b(domestic violence|sexual assault|stalking|human trafficking|restraining order|protective order)/i.test(
      corpus,
    )
  ) {
    out.defense_k = true;
  }

  if (out.defense_k) {
    if (/does not live in the dwelling|not live in the unit/i.test(corpus)) out.defense_k1 = true;
    if (/lives in the dwelling|1161\.3\(d\)/i.test(corpus)) out.defense_k2 = true;
  }

  if (/\b(call(ing)? the police|emergency assistance|911.*evict)/i.test(corpus)) {
    out.defense_l = true;
  }

  if (
    /\b(rental assistance|rent relief|housing is key|era\b|treasurer|covid.*rent|declaration.*rent|50897)/i.test(
      corpus,
    ) ||
    (ctx.parsedDocumentFields?.normalizedExtraction?.rentalAssistanceAllegations?.length ?? 0) > 0
  ) {
    out.defense_m = true;
  }

  if (out.defense_m) {
    if (/relating to the amount claimed in the notice to pay rent or quit/i.test(corpus)) {
      out.defense_m1 = true;
    }
    if (/for rent accruing since the notice to pay rent or quit/i.test(corpus)) {
      out.defense_m2 = true;
    }
    if (/only on late fees for defendant|15 days.*rental assistance/i.test(corpus)) {
      out.defense_m3 = true;
    }
  }

  if (/\b(covid.*eviction|covid.*ordinance|local.*covid)/i.test(corpus)) {
    out.defense_n = true;
  }

  if (/\b(cares act|30 day.*notice|federally backed|federal mortgage)/i.test(corpus)) {
    out.defense_o = true;
  }

  if (
    /\b(1179\.04|security deposit.*rent|applied.*payment|march 1, 2020|september 30, 2021)/i.test(corpus)
  ) {
    out.defense_p = true;
  }
  if (out.defense_p) {
    if (/security deposit.*rent|applied a security deposit/i.test(corpus)) out.defense_p1 = true;
    if (/monthly rental payment|prospective month/i.test(corpus)) out.defense_p2 = true;
  }

  if (/\b(third party|1947\.3|12955)/i.test(corpus)) {
    out.defense_q = true;
  }

  if (/\b(disability|reasonable accommodation|12176)/i.test(corpus)) {
    out.defense_r = true;
  }

  if (
    /\b(improper.*notice|defective.*notice|insufficient.*notice|invalid.*notice|notice.*defect|not.*properly served|defective service|other defense)/i.test(
      corpus,
    )
  ) {
    out.defense_s = true;
  }

  return out;
}
