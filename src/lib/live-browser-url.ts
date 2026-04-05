/**
 * Browser Use live embed expects a ~16:9 iframe; see
 * https://docs.browser-use.com/cloud/tips/live-view/iframe-embed
 *
 * `ui=false` hides the in-embed URL bar / tabs so the remote viewport uses the space.
 */
export function liveBrowserEmbedUrl(liveUrl: string): string {
  try {
    const u = new URL(liveUrl);
    if (!u.searchParams.has("ui")) {
      u.searchParams.set("ui", "false");
    }
    return u.toString();
  } catch {
    return liveUrl;
  }
}
