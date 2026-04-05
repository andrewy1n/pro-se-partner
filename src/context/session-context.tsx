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
  DefenseItem,
  DeadlineResult,
  LegalAidItem,
  MessageResponse,
  SessionPollResponse,
  SessionSnapshot,
  SessionStreamEvent,
} from "@/lib/types";
import { convertMessagesToActivityFeed } from "@/lib/message-converter";

type TrackedSessionInput = {
  appSessionId: string;
  browserSessionId: string | null;
};

interface SessionContextType {
  activeSession: SessionSnapshot | null;
  deadlineSession: SessionSnapshot | null;
  defenseSession: SessionSnapshot | null;
  legalAidSession: SessionSnapshot | null;
  activityFeed: ActivityFeedItem[];
  deadlineResult: DeadlineResult | null;
  defenseResult: DefenseItem[] | null;
  legalAidResult: LegalAidItem[] | null;
  isPolling: boolean;
  setTrackedSession: (next: TrackedSessionInput | null) => void;
  setTrackedDefenseSession: (next: TrackedSessionInput | null) => void;
  setTrackedLegalAidSession: (next: TrackedSessionInput | null) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

function buildPollUrl(
  appSessionId: string,
  browserSessionId: string,
  agentId: AgentId,
): string {
  return `/api/sessions/${appSessionId}?browserSessionId=${browserSessionId}&agentId=${agentId}`;
}

function buildStreamUrl(
  appSessionId: string,
  browserSessionId: string,
  agentId: AgentId,
): string {
  return `/api/sessions/${appSessionId}/stream?browserSessionId=${browserSessionId}&agentId=${agentId}`;
}

function appendMessage(
  current: MessageResponse[],
  nextMessage: MessageResponse,
): MessageResponse[] {
  if (current.some((message) => message.id === nextMessage.id)) return current;
  return [...current, nextMessage].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function isTerminalState(data: SessionPollResponse | undefined): boolean {
  const status = data?.activeSession?.status;
  if (status === "idle") return true;
  if (status === "stopped" || status === "timed_out" || status === "error") return true;
  return false;
}

async function fetchSessionPoll(url: string): Promise<SessionPollResponse> {
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
    throw new Error(`Session poll failed (${response.status}): ${detail || response.statusText}`);
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
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [trackedSession, setTrackedSession] = useState<TrackedSessionInput | null>(null);
  const [trackedDefenseSession, setTrackedDefenseSession] = useState<TrackedSessionInput | null>(null);
  const [trackedLegalAidSession, setTrackedLegalAidSession] = useState<TrackedSessionInput | null>(null);
  const [deadlineMessages, setDeadlineMessages] = useState<MessageResponse[]>([]);
  const [defenseMessages, setDefenseMessages] = useState<MessageResponse[]>([]);
  const [legalAidMessages, setLegalAidMessages] = useState<MessageResponse[]>([]);

  useEffect(() => {
    setDeadlineMessages([]);
  }, [trackedSession?.browserSessionId]);

  useEffect(() => {
    setDefenseMessages([]);
  }, [trackedDefenseSession?.browserSessionId]);

  useEffect(() => {
    setLegalAidMessages([]);
  }, [trackedLegalAidSession?.browserSessionId]);

  useEffect(() => {
    if (!trackedSession?.appSessionId || !trackedSession.browserSessionId) return;

    let closed = false;
    const stream = new EventSource(
      buildStreamUrl(
        trackedSession.appSessionId,
        trackedSession.browserSessionId,
        "agent-4-deadline-procedure",
      ),
    );

    stream.onmessage = (event) => {
      const payload = JSON.parse(event.data) as SessionStreamEvent;
      if (payload.type === "message") {
        setDeadlineMessages((current) => appendMessage(current, payload.message));
        return;
      }
      if (payload.type === "error") {
        console.error("[session-stream:deadline]", payload.message);
        return;
      }
      closed = true;
      stream.close();
    };

    stream.onerror = () => {
      if (closed) return;
      console.error("[session-stream:deadline] connection failed");
    };

    return () => {
      closed = true;
      stream.close();
    };
  }, [trackedSession?.appSessionId, trackedSession?.browserSessionId]);

  useEffect(() => {
    if (!trackedDefenseSession?.appSessionId || !trackedDefenseSession.browserSessionId) return;

    let closed = false;
    const stream = new EventSource(
      buildStreamUrl(
        trackedDefenseSession.appSessionId,
        trackedDefenseSession.browserSessionId,
        "agent-5-defense-research",
      ),
    );

    stream.onmessage = (event) => {
      const payload = JSON.parse(event.data) as SessionStreamEvent;
      if (payload.type === "message") {
        setDefenseMessages((current) => appendMessage(current, payload.message));
        return;
      }
      if (payload.type === "error") {
        console.error("[session-stream:defense]", payload.message);
        return;
      }
      closed = true;
      stream.close();
    };

    stream.onerror = () => {
      if (closed) return;
      console.error("[session-stream:defense] connection failed");
    };

    return () => {
      closed = true;
      stream.close();
    };
  }, [trackedDefenseSession?.appSessionId, trackedDefenseSession?.browserSessionId]);

  useEffect(() => {
    if (!trackedLegalAidSession?.appSessionId || !trackedLegalAidSession.browserSessionId) return;

    let closed = false;
    const stream = new EventSource(
      buildStreamUrl(
        trackedLegalAidSession.appSessionId,
        trackedLegalAidSession.browserSessionId,
        "agent-6-legal-aid",
      ),
    );

    stream.onmessage = (event) => {
      const payload = JSON.parse(event.data) as SessionStreamEvent;
      if (payload.type === "message") {
        setLegalAidMessages((current) => appendMessage(current, payload.message));
        return;
      }
      if (payload.type === "error") {
        console.error("[session-stream:legal-aid]", payload.message);
        return;
      }
      closed = true;
      stream.close();
    };

    stream.onerror = () => {
      if (closed) return;
      console.error("[session-stream:legal-aid] connection failed");
    };

    return () => {
      closed = true;
      stream.close();
    };
  }, [trackedLegalAidSession?.appSessionId, trackedLegalAidSession?.browserSessionId]);

  // Deadline tracker polling
  const deadlineQuery = useQuery({
    queryKey: [
      "sessions",
      "deadline",
      trackedSession?.appSessionId,
      trackedSession?.browserSessionId,
    ],
    enabled: Boolean(trackedSession?.appSessionId && trackedSession?.browserSessionId),
    queryFn: () =>
      fetchSessionPoll(
        buildPollUrl(
          trackedSession!.appSessionId,
          trackedSession!.browserSessionId!,
          "agent-4-deadline-procedure",
        ),
      ),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchInterval: (query) => {
      if (isTerminalState(query.state.data)) {
        return false;
      }
      return trackedSession?.browserSessionId ? 1000 : false;
    },
  });

  // Defense research polling
  const defenseQuery = useQuery({
    queryKey: [
      "sessions",
      "defense",
      trackedDefenseSession?.appSessionId,
      trackedDefenseSession?.browserSessionId,
    ],
    enabled: Boolean(trackedDefenseSession?.appSessionId && trackedDefenseSession?.browserSessionId),
    queryFn: () =>
      fetchSessionPoll(
        buildPollUrl(
          trackedDefenseSession!.appSessionId,
          trackedDefenseSession!.browserSessionId!,
          "agent-5-defense-research",
        ),
      ),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchInterval: (query) => {
      if (isTerminalState(query.state.data)) {
        return false;
      }
      return trackedDefenseSession?.browserSessionId ? 1000 : false;
    },
  });

  // Legal aid polling
  const legalAidQuery = useQuery({
    queryKey: [
      "sessions",
      "legal-aid",
      trackedLegalAidSession?.appSessionId,
      trackedLegalAidSession?.browserSessionId,
    ],
    enabled: Boolean(trackedLegalAidSession?.appSessionId && trackedLegalAidSession?.browserSessionId),
    queryFn: () =>
      fetchSessionPoll(
        buildPollUrl(
          trackedLegalAidSession!.appSessionId,
          trackedLegalAidSession!.browserSessionId!,
          "agent-6-legal-aid",
        ),
      ),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchInterval: (query) => {
      if (isTerminalState(query.state.data)) {
        return false;
      }
      return trackedLegalAidSession?.browserSessionId ? 1000 : false;
    },
  });

  // Pick the active session for the iframe: whichever is currently running, with deadline as fallback
  const activeSession = useMemo<SessionSnapshot | null>(() => {
    const candidates = [
      deadlineQuery.data?.activeSession,
      defenseQuery.data?.activeSession,
      legalAidQuery.data?.activeSession,
    ].filter((s): s is SessionSnapshot => s != null);

    return (
      candidates.find((s) => s.status === "running") ??
      candidates.find((s) => s.status === "created") ??
      candidates[0] ??
      null
    );
  }, [deadlineQuery.data, defenseQuery.data, legalAidQuery.data]);

  // Merge activity feeds from all sessions, sorted chronologically
  const activityFeed = useMemo<ActivityFeedItem[]>(() => {
    const deadlineFeed = convertMessagesToActivityFeed(
      deadlineMessages,
      {
        agentId: "agent-4-deadline-procedure",
        sessionStatus: deadlineQuery.data?.activeSession?.status ?? null,
      },
    );
    const defenseFeed = convertMessagesToActivityFeed(
      defenseMessages,
      {
        agentId: "agent-5-defense-research",
        sessionStatus: defenseQuery.data?.activeSession?.status ?? null,
      },
    );
    const legalAidFeed = convertMessagesToActivityFeed(
      legalAidMessages,
      {
        agentId: "agent-6-legal-aid",
        sessionStatus: legalAidQuery.data?.activeSession?.status ?? null,
      },
    );

    return [...deadlineFeed, ...defenseFeed, ...legalAidFeed].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [
    deadlineMessages,
    deadlineQuery.data,
    defenseMessages,
    defenseQuery.data,
    legalAidMessages,
    legalAidQuery.data,
  ]);

  useEffect(() => {
    for (const [query, label] of [
      [deadlineQuery, "deadline"] as const,
      [defenseQuery, "defense"] as const,
      [legalAidQuery, "legal-aid"] as const,
    ]) {
      if (query.isError && query.error) {
        console.error(`[session-poll:${label}] query error`, query.error);
      }
    }
  }, [
    deadlineQuery.isError, deadlineQuery.error,
    defenseQuery.isError, defenseQuery.error,
    legalAidQuery.isError, legalAidQuery.error,
  ]);

  const value = useMemo<SessionContextType>(
    () => ({
      activeSession,
      deadlineSession: deadlineQuery.data?.activeSession ?? null,
      defenseSession: defenseQuery.data?.activeSession ?? null,
      legalAidSession: legalAidQuery.data?.activeSession ?? null,
      activityFeed,
      deadlineResult: deadlineQuery.data?.deadlineResult ?? null,
      defenseResult: defenseQuery.data?.defenseResult ?? null,
      legalAidResult: legalAidQuery.data?.legalAidResult ?? null,
      isPolling:
        deadlineQuery.isFetching || defenseQuery.isFetching || legalAidQuery.isFetching,
      setTrackedSession,
      setTrackedDefenseSession,
      setTrackedLegalAidSession,
    }),
    [
      activeSession,
      activityFeed,
      deadlineQuery.data,
      deadlineQuery.isFetching,
      defenseQuery.data,
      defenseQuery.isFetching,
      legalAidQuery.data,
      legalAidQuery.isFetching,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be inside SessionProvider");
  return ctx;
}
