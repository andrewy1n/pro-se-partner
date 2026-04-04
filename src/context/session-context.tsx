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
  DeadlineResult,
  SessionPollResponse,
  SessionSnapshot,
} from "@/lib/types";
import { convertMessagesForDashboard } from "@/lib/message-converter";

interface SessionContextType {
  activeSession: SessionSnapshot | null;
  activityFeed: ActivityFeedItem[];
  deadlineResult: DeadlineResult | null;
  isPolling: boolean;
  setTrackedSession: (next: {
    appSessionId: string;
    browserSessionId: string | null;
  } | null) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [trackedSession, setTrackedSession] = useState<{
    appSessionId: string;
    browserSessionId: string | null;
  } | null>(null);

  const pollingQuery = useQuery({
    queryKey: [
      "sessions",
      "active",
      trackedSession?.appSessionId,
      trackedSession?.browserSessionId,
    ],
    enabled: Boolean(trackedSession?.appSessionId && trackedSession?.browserSessionId),
    queryFn: async () => {
      const url = `/api/sessions/${trackedSession?.appSessionId}?browserSessionId=${trackedSession?.browserSessionId}`;
      try {
        const response = await fetch(url);
        const bodyText = await response.text();
        if (!response.ok) {
          let detail = bodyText.slice(0, 500);
          try {
            const parsed = JSON.parse(bodyText) as { error?: string };
            if (typeof parsed.error === "string") detail = parsed.error;
          } catch {
            /* keep raw slice */
          }
          console.error("[session-poll] request failed", {
            status: response.status,
            url,
            detail,
          });
          throw new Error(
            `Session poll failed (${response.status}): ${detail || response.statusText}`,
          );
        }
        try {
          return JSON.parse(bodyText) as SessionPollResponse;
        } catch (parseErr) {
          console.error("[session-poll] invalid JSON", {
            url,
            bodyPreview: bodyText.slice(0, 200),
            parseErr,
          });
          throw parseErr;
        }
      } catch (err) {
        if (err instanceof TypeError) {
          console.error("[session-poll] network error", { url, err });
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
        (Boolean(data?.deadlineResult) || Boolean(data?.messages.length))
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

    return convertMessagesForDashboard({
      messages: pollingQuery.data.messages,
      deadlineResult: pollingQuery.data.deadlineResult,
      agentId: pollingQuery.data.activeSession?.activeAgentId ?? "agent-4-deadline-procedure",
      sessionStatus: pollingQuery.data.activeSession?.status ?? null,
    });
  }, [pollingQuery.data]);

  useEffect(() => {
    if (!pollingQuery.isError || !pollingQuery.error) return;
    console.error("[session-poll] query error", pollingQuery.error);
  }, [pollingQuery.isError, pollingQuery.error]);

  const value = useMemo<SessionContextType>(
    () => ({
      activeSession: pollingQuery.data?.activeSession ?? null,
      activityFeed: dashboardState.activityFeed,
      deadlineResult: dashboardState.deadlineResult,
      isPolling: pollingQuery.isFetching,
      setTrackedSession,
    }),
    [dashboardState.activityFeed, dashboardState.deadlineResult, pollingQuery.data, pollingQuery.isFetching],
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
