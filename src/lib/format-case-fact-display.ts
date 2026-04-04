/**
 * Turns intake enum slugs (e.g. summons_complaint) into readable labels.
 * Leaves plain-language strings, dates, and mixed-case text unchanged.
 */
export function formatCaseFactDisplay(value: string | null): string {
  if (value == null || value.trim() === "") return "Unknown";
  if (!isSlugStyleEnum(value)) return value;
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isSlugStyleEnum(s: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)*$/i.test(s.trim());
}
