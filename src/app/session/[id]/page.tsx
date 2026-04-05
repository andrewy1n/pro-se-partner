"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { BrowserPanel } from "@/components/browser-panel";
import { ActivityStrip } from "@/components/activity-strip";
import { SessionViewToggle, type SessionView } from "@/components/session-view-toggle";
import { CaseFactsPanel } from "@/components/dashboard/case-facts-panel";
import { Wave1DispatchPanel } from "@/components/dashboard/wave1-dispatch-panel";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { ActionItemsPanel } from "@/components/dashboard/action-items-panel";
import { ResourcesPanel } from "@/components/dashboard/resources-panel";
import { HitlGate } from "@/components/hitl-gate";
import { useSession } from "@/context/session-context";
import { useCaseContext } from "@/context/case-context";
import { intakeStorageKey, parseIntakeSessionPayload } from "@/lib/intake-storage";
import type { DispatchWave1Response, IntakeSessionPayload, Wave1AgentKey } from "@/lib/types";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const [dispatched, setDispatched] = useState(false);
  const [activeView, setActiveView] = useState<SessionView>("browser");
  const autoSwitchedRef = useRef(false);
  const {
    activeSession,
    deadlineSession,
    defenseSession,
    legalAidSession,
    activityFeed,
    deadlineResult: polledDeadlineResult,
    defenseResult: polledDefenseResult,
    legalAidResult: polledLegalAidResult,
    isPolling,
    setTrackedSession,
    setTrackedDefenseSession,
    setTrackedLegalAidSession,
  } = useSession();
  const {
    caseContext,
    setCaseContext,
    setDeadlineResult,
    setDefenses,
    setLegalAid,
    setHitlGate,
    hitlGate,
    actionItems,
    formArtifacts,
    defenses,
    legalAid,
    deadlineResult,
  } = useCaseContext();

  // Hydrate sessions from sessionStorage on mount
  useEffect(() => {
    const id = params.id;
    if (!id) return;
    const raw = sessionStorage.getItem(intakeStorageKey(id));
    if (!raw) return;
    let payload = parseIntakeSessionPayload(raw);
    if (!payload) return;

    const anySession =
      Boolean(payload.deadlineTrackerSession?.sessionId) ||
      Boolean(payload.defenseResearchSession?.sessionId) ||
      Boolean(payload.legalAidSession?.sessionId);

    if (anySession && !payload.dispatched) {
      const fixed: IntakeSessionPayload = { ...payload, dispatched: true };
      sessionStorage.setItem(intakeStorageKey(id), JSON.stringify(fixed));
      payload = fixed;
    }

    setCaseContext(payload.caseContext);
    setDispatched(payload.dispatched ?? false);

    setTrackedSession({
      appSessionId: id,
      browserSessionId: payload.deadlineTrackerSession?.sessionId ?? null,
    });
    setTrackedDefenseSession({
      appSessionId: id,
      browserSessionId: payload.defenseResearchSession?.sessionId ?? null,
    });
    setTrackedLegalAidSession({
      appSessionId: id,
      browserSessionId: payload.legalAidSession?.sessionId ?? null,
    });

    return () => {
      setTrackedSession(null);
      setTrackedDefenseSession(null);
      setTrackedLegalAidSession(null);
    };
  }, [params.id, setCaseContext, setTrackedSession, setTrackedDefenseSession, setTrackedLegalAidSession]);

  // Wire deadline result into case context
  useEffect(() => {
    setDeadlineResult(polledDeadlineResult);

    if (polledDeadlineResult?.status === "needs_input") {
      const missingFacts = polledDeadlineResult.missingFacts
        .map((fact) => fact.replace(/_/g, " "))
        .join(", ");

      setHitlGate({
        isBlockedOnUser: true,
        instruction: missingFacts
          ? `We need these facts to calculate your response deadline: ${missingFacts}.`
          : "We need more case details before we can calculate your response deadline.",
      });
      return;
    }

    setHitlGate({
      isBlockedOnUser: false,
      instruction: null,
    });
  }, [polledDeadlineResult, setDeadlineResult, setHitlGate]);

  // Wire defense result into case context
  useEffect(() => {
    if (polledDefenseResult) setDefenses(polledDefenseResult);
  }, [polledDefenseResult, setDefenses]);

  // Wire legal aid result into case context
  useEffect(() => {
    if (polledLegalAidResult) setLegalAid(polledLegalAidResult);
  }, [polledLegalAidResult, setLegalAid]);

  // Auto-switch to dashboard once polling settles after Wave 1 activity (once)
  useEffect(() => {
    if (!isPolling && dispatched && !autoSwitchedRef.current) {
      autoSwitchedRef.current = true;
      setActiveView("dashboard");
    }
  }, [isPolling, dispatched]);

  async function handleDispatchWave1(agents: Wave1AgentKey[]) {
    const id = params.id;
    if (!id || !caseContext || agents.length === 0) return;

    const res = await fetch("/api/agents/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, caseContext, agents }),
    });

    if (!res.ok) return;

    const data = (await res.json()) as DispatchWave1Response;

    const raw = sessionStorage.getItem(intakeStorageKey(id));
    const payload = parseIntakeSessionPayload(raw ?? "");
    if (!payload) return;

    const next: IntakeSessionPayload = {
      ...payload,
      deadlineTrackerSession:
        data.deadlineTrackerSession ?? payload.deadlineTrackerSession,
      defenseResearchSession:
        data.defenseResearchSession ?? payload.defenseResearchSession,
      legalAidSession: data.legalAidSession ?? payload.legalAidSession,
    };

    const hasAnySession =
      Boolean(next.deadlineTrackerSession?.sessionId) ||
      Boolean(next.defenseResearchSession?.sessionId) ||
      Boolean(next.legalAidSession?.sessionId);
    next.dispatched = hasAnySession;

    sessionStorage.setItem(intakeStorageKey(id), JSON.stringify(next));

    setTrackedSession({
      appSessionId: id,
      browserSessionId: next.deadlineTrackerSession?.sessionId ?? null,
    });
    setTrackedDefenseSession({
      appSessionId: id,
      browserSessionId: next.defenseResearchSession?.sessionId ?? null,
    });
    setTrackedLegalAidSession({
      appSessionId: id,
      browserSessionId: next.legalAidSession?.sessionId ?? null,
    });

    setDispatched(next.dispatched);
  }

  return (
    <main className="flex min-h-dvh flex-col gap-4 p-4">
      <SessionViewToggle activeView={activeView} onViewChange={setActiveView} />

      {activeView === "browser" ? (
        <section className="flex min-h-0 flex-1 flex-col gap-4">
          <BrowserPanel
            tabs={[
              {
                agentId: "agent-4-deadline-procedure",
                label: "Deadline Tracker",
                liveUrl: deadlineSession?.liveUrl,
                status: deadlineSession?.status ?? null,
              },
              {
                agentId: "agent-5-defense-research",
                label: "Defense Research",
                liveUrl: defenseSession?.liveUrl,
                status: defenseSession?.status ?? null,
              },
              {
                agentId: "agent-6-legal-aid",
                label: "Legal Aid",
                liveUrl: legalAidSession?.liveUrl,
                status: legalAidSession?.status ?? null,
              },
            ]}
          />
          <ActivityStrip items={activityFeed} />
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
          <div className="space-y-4">
            <StatusPanel
              model={{
                countdownLabel: deadlineResult?.responseDeadline ?? "TBD",
                caseStage: activeSession?.stage ?? "stage-1-intake",
                callToAction: hitlGate.instruction,
                consequenceSummary: deadlineResult?.consequenceSummary ?? null,
                projectedTrialWindow: deadlineResult?.projectedTrialWindow ?? null,
                citations: deadlineResult?.citations ?? [],
                missingFacts:
                  deadlineResult?.missingFacts.length
                    ? deadlineResult.missingFacts
                    : caseContext?.missingFacts ?? [],
                explanation: deadlineResult?.explanation ?? null,
              }}
            />

            {hitlGate.isBlockedOnUser ? (
              <HitlGate instruction={hitlGate.instruction ?? "Complete the required task to continue."} />
            ) : (
              <ActionItemsPanel
                model={{
                  checklist: actionItems,
                  formArtifacts,
                }}
              />
            )}
          </div>

          <div className="space-y-4">
            <Wave1DispatchPanel caseContext={caseContext} onDispatchWave1={handleDispatchWave1} />
            <CaseFactsPanel caseContext={caseContext} />

            <ResourcesPanel
              model={{ defenses, legalAid }}
              isDefensesLoading={isPolling && defenses.length === 0}
              isLegalAidLoading={isPolling && legalAid.length === 0}
            />
          </div>
        </section>
      )}

      <p className="sr-only">Session id: {params.id}</p>
    </main>
  );
}
