"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  ActivityFeedItem,
  AgentId,
  DeadlineResult,
  SessionPollResponse,
  SessionSnapshot,
} from "@/lib/types";
import { convertMessagesForDashboard } from "@/lib/message-converter";

interface TrackedBrowserSession {
  appSessionId: string;
  browserSessionId: string | null;
  activeAgentId: AgentId;
}

interface SessionContextType {
  activeSession: SessionSnapshot | null;
  activityFeed: ActivityFeedItem[];
  deadlineResult: DeadlineResult | null;
  formsNavigatorResult: SessionPollResponse["formsNavigatorResult"];
  isPolling: boolean;
  trackedSession: TrackedBrowserSession | null;
  setTrackedSession: (next: TrackedBrowserSession | null) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [trackedSession, setTrackedSession] = useState<TrackedBrowserSession | null>(null);

  const pollingQuery = useQuery({
    queryKey: [
      "sessions",
      "active",
      trackedSession?.appSessionId,
      trackedSession?.browserSessionId,
      trackedSession?.activeAgentId,
    ],
    enabled: Boolean(trackedSession?.appSessionId && trackedSession?.browserSessionId),
    queryFn: async () => {
      const appId = trackedSession?.appSessionId;
      const browserId = trackedSession?.browserSessionId;
      const agentId = trackedSession?.activeAgentId ?? "agent-4-deadline-procedure";
      if (!appId || !browserId) {
        throw new Error("Missing session ids");
      }
      const url = `/api/sessions/${appId}?browserSessionId=${encodeURIComponent(browserId)}&activeAgentId=${encodeURIComponent(agentId)}`;
      try {
        const response = await fetch(url);
        const bodyText = await response.text();
        if (!response.ok) {
          let detail = bodyText.slice(0, 500);
          try {
            const parsed = JSON.parse(bodyText) as {
              error?: string;
              message?: string;
            };
            if (typeof parsed.error === "string") detail = parsed.error;
            else if (typeof parsed.message === "string") detail = parsed.message;
          } catch {
            /* keep raw slice */
          }
          const status = response.status;
          const statusText = response.statusText?.trim() || "";
          const summary =
            detail.trim() ||
            statusText ||
            (bodyText.length === 0 ? "(empty response body)" : bodyText.slice(0, 120));
          console.error(
            `[session-poll] request failed: HTTP ${status}${statusText ? ` ${statusText}` : ""} | ${url} | ${summary}`,
          );
          throw new Error(`Session poll failed (${status}): ${summary}`);
        }
        try {
          return JSON.parse(bodyText) as SessionPollResponse;
        } catch (parseErr) {
          const msg =
            parseErr instanceof Error ? parseErr.message : String(parseErr);
          console.error(
            `[session-poll] invalid JSON | ${url} | ${msg} | bodyPreview=${JSON.stringify(bodyText.slice(0, 200))}`,
          );
          throw parseErr;
        }
      } catch (err) {
        if (err instanceof TypeError) {
          console.error(`[session-poll] network error | ${url} | ${err.message}`);
        }
        throw err;
      }
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = query.state.data?.activeSession?.status;
      if (
        status === "idle" &&
        (Boolean(data?.deadlineResult) ||
          Boolean(data?.formsNavigatorResult) ||
          Boolean(data?.messages.length))
      ) {
        return false;
      }
      if (status === "stopped" || status === "timed_out" || status === "error") {
        return false;
      }
      return trackedSession?.browserSessionId ? 1000 : false;
    },
  });

  const dashboardState = useMemo(() => {
    if (!pollingQuery.data) {
      return {
        activityFeed: [] as ActivityFeedItem[],
        deadlineResult: null as DeadlineResult | null,
      };
    }

    const agentId =
      trackedSession?.activeAgentId ??
      pollingQuery.data.activeSession?.activeAgentId ??
      "agent-4-deadline-procedure";

    return convertMessagesForDashboard({
      messages: pollingQuery.data.messages,
      deadlineResult: pollingQuery.data.deadlineResult,
      agentId,
      sessionStatus: pollingQuery.data.activeSession?.status ?? null,
    });
  }, [pollingQuery.data, trackedSession?.activeAgentId]);

  useEffect(() => {
    if (!pollingQuery.isError || !pollingQuery.error) return;
    const err = pollingQuery.error;
    console.error(
      `[session-poll] query error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }, [pollingQuery.isError, pollingQuery.error]);

  const value = useMemo<SessionContextType>(
    () => ({
      activeSession: pollingQuery.data?.activeSession ?? null,
      activityFeed: dashboardState.activityFeed,
      deadlineResult: dashboardState.deadlineResult,
      formsNavigatorResult: pollingQuery.data?.formsNavigatorResult ?? null,
      isPolling: pollingQuery.isFetching,
      trackedSession,
      setTrackedSession,
    }),
    [
      dashboardState.activityFeed,
      dashboardState.deadlineResult,
      pollingQuery.data,
      pollingQuery.isFetching,
      pollingQuery.data?.formsNavigatorResult,
      trackedSession,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be inside SessionProvider");
  return ctx;
}
