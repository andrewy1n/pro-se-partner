"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { ActivityFeedItem, SessionSnapshot } from "@/lib/types";

interface SessionContextType {
  activeSession: SessionSnapshot | null;
  activityFeed: ActivityFeedItem[];
  isPolling: boolean;
  // TODO: Add query-backed dashboard models and per-agent session state.
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pollingQuery = useQuery({
    queryKey: ["sessions", "active"],
    // TODO: Poll sessions/messages every 1 second and stop on terminal states.
    queryFn: async () => {
      return null;
    },
    refetchInterval: 1000,
  });

  const value = useMemo<SessionContextType>(
    () => ({
      activeSession: pollingQuery.data ?? null,
      activityFeed: [],
      isPolling: pollingQuery.isFetching,
      // TODO: Map multi-agent session snapshots to active Activity Strip rows.
    }),
    [pollingQuery.data, pollingQuery.isFetching],
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
