"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { BrowserPanel } from "@/components/browser-panel";
import { ActivityStrip } from "@/components/activity-strip";
import { StatusBar } from "@/components/status-bar";
import { SessionViewToggle, type SessionView } from "@/components/session-view-toggle";
import { CaseFactsPanel } from "@/components/dashboard/case-facts-panel";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { ActionItemsPanel } from "@/components/dashboard/action-items-panel";
import { ResourcesPanel } from "@/components/dashboard/resources-panel";
import { HitlGate } from "@/components/hitl-gate";
import { useSession } from "@/context/session-context";
import { useCaseContext } from "@/context/case-context";
import { intakeStorageKey, parseIntakeSessionPayload } from "@/lib/intake-storage";
import type { DispatchWave1Response } from "@/lib/types";

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
    const payload = parseIntakeSessionPayload(raw);
    if (!payload) return;

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

  // Auto-switch to dashboard when all agents finish (once)
  useEffect(() => {
    if (!isPolling && dispatched && !autoSwitchedRef.current) {
      autoSwitchedRef.current = true;
      setActiveView("dashboard");
    }
  }, [isPolling, dispatched]);

  async function handleRunAnalysis() {
    const id = params.id;
    if (!id || !caseContext) return;

    const res = await fetch("/api/agents/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, caseContext }),
    });

    if (!res.ok) return;

    const data = (await res.json()) as DispatchWave1Response;

    setTrackedSession({
      appSessionId: id,
      browserSessionId: data.deadlineTrackerSession?.sessionId ?? null,
    });
    setTrackedDefenseSession({
      appSessionId: id,
      browserSessionId: data.defenseResearchSession?.sessionId ?? null,
    });
    setTrackedLegalAidSession({
      appSessionId: id,
      browserSessionId: data.legalAidSession?.sessionId ?? null,
    });

    setDispatched(true);

    // Persist dispatched state + sessions to storage so refresh works
    const raw = sessionStorage.getItem(intakeStorageKey(id));
    const payload = parseIntakeSessionPayload(raw ?? "");
    if (payload) {
      sessionStorage.setItem(
        intakeStorageKey(id),
        JSON.stringify({
          ...payload,
          dispatched: true,
          deadlineTrackerSession: data.deadlineTrackerSession,
          defenseResearchSession: data.defenseResearchSession,
          legalAidSession: data.legalAidSession,
        }),
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <StatusBar
        countdownLabel={deadlineResult?.responseDeadline ?? "TBD"}
        agentStatuses={[
          { label: "Deadline Tracker", status: deadlineSession?.status ?? null },
          { label: "Defense Research", status: defenseSession?.status ?? null },
          { label: "Legal Aid", status: legalAidSession?.status ?? null },
        ]}
        isPolling={isPolling}
      />
      <SessionViewToggle activeView={activeView} onViewChange={setActiveView} />

      {activeView === "browser" ? (
        <section className="flex flex-1 flex-col gap-4">
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
            <CaseFactsPanel
              caseContext={caseContext}
              dispatched={dispatched}
              onRunAnalysis={dispatched ? undefined : handleRunAnalysis}
            />

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
