import type { MessageResponse } from "@/lib/types";
import type { ActivityFeedItem } from "@/lib/types";

export interface DashboardConversionResult {
  activityFeed: ActivityFeedItem[];
}

export function convertMessagesToActivityFeed(
  _messages: MessageResponse[],
): ActivityFeedItem[] {
  // TODO: Normalize Browser Use messages into agent-prefixed feed rows.
  // TODO: Deduplicate updates and preserve chronological order.
  return [];
}

export function convertMessagesForDashboard(
  _messages: MessageResponse[],
): DashboardConversionResult {
  // TODO: Derive panel-specific data models from normalized message stream.
  return {
    activityFeed: [],
  };
}
