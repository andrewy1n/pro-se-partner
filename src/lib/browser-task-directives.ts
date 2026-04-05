/**
 * Prepended to every Browser Use Cloud task so agents prioritize real navigation
 * on official sites over search-result snippets or third-party summaries.
 */
export const BROWSER_USE_DEEP_NAVIGATION_PREAMBLE = `## Browser navigation (applies to this entire task)

- Your job is **substantive web navigation**, not a quick Google search. **Do not** treat search-result snippets, AI overviews, or law-firm blogs as sufficient verification.
- If you use a search engine, use it only to **locate the correct official URL**, then **leave the search engine** and complete your work on **government, court, or legislative** sites.
- Prefer navigating directly when you know the domain: type or follow links to **courts.ca.gov**, **leginfo.legislature.ca.gov**, **lacourt.org**, and other **.gov** sources relevant to the task.
- **Minimum depth:** open the destination site → reach the specific self-help article, statute section, court rule, form page, or program page → **read enough of the page** (scroll, follow subpages, use on-site search) to justify what you report.
- For California statutes: use **Legislative Information (leginfo)** or official court materials that quote or link to the code; read the **applicable section text**, not just the search hit title.
- **Forbidden:** finishing the task based only on a search results page or a single glance at a meta description without opening and reading authoritative pages.`;

export function withBrowserNavigationDirectives(task: string): string {
  return `${BROWSER_USE_DEEP_NAVIGATION_PREAMBLE}\n\n${task}`;
}
