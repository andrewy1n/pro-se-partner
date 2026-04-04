/**
 * Display-only helpers for parsed UD-100 / complaint summary in the Case Facts panel.
 * Does not change stored parse payloads; raw JSON remains full fidelity for debugging.
 */

/** Standard judicial-council boilerplate — omit from user-facing allegation lists. */
export function isDoesUnknownBoilerplate(line: string): boolean {
  const t = line.trim().toLowerCase().replace(/\s+/g, " ");
  return (
    t.includes("true names and capacities") &&
    /\bdoes\b/.test(t) &&
    t.includes("unknown")
  );
}

export function filterDisplayAllegations(lines: string[] | undefined): string[] {
  return (lines ?? []).filter((line) => !isDoesUnknownBoilerplate(line));
}
