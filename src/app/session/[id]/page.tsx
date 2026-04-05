"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { resolveEffectiveBrowserTab } from "@/lib/browser-panel-tabs";
import {
  extractBase64FromPdfDataUrl,
  runUd105PdfFill,
} from "@/lib/client-ud105-fill";
import type {
  AgentId,
  CaseFacts,
  DispatchWave1Response,
  IntakeSessionPayload,
  Wave1AgentKey,
} from "@/lib/types";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const [dispatched, setDispatched] = useState(false);
  const [activeView, setActiveView] = useState<SessionView>("browser");
  const autoSwitchedRef = useRef(false);
  const [selectedBrowserAgentId, setSelectedBrowserAgentId] = useState<AgentId | null>(null);

  const {
    activeSession,
    formsSession,
    deadlineSession,
    defenseSession,
    legalAidSession,
    activityFeed,
    formsNavigatorResult,
    deadlineResult: polledDeadlineResult,
    defenseResult: polledDefenseResult,
    legalAidResult: polledLegalAidResult,
    isPolling,
    setTrackedFormsSession,
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
    addFormArtifact,
    setHitlGate,
    hitlGate,
    actionItems,
    formArtifacts,
    defenses,
    legalAid,
    deadlineResult,
    pdfFillState,
    setPdfFillState,
  } = useCaseContext();

  const browserTabs = useMemo(
    () => [
      {
        agentId: "agent-3-forms-navigator" as const,
        label: "Forms Navigator",
        liveUrl: formsSession?.liveUrl,
        status: formsSession?.status ?? null,
      },
      {
        agentId: "agent-4-deadline-procedure" as const,
        label: "Deadline Tracker",
        liveUrl: deadlineSession?.liveUrl,
        status: deadlineSession?.status ?? null,
      },
      {
        agentId: "agent-5-defense-research" as const,
        label: "Defense Research",
        liveUrl: defenseSession?.liveUrl,
        status: defenseSession?.status ?? null,
      },
      {
        agentId: "agent-6-legal-aid" as const,
        label: "Legal Aid",
        liveUrl: legalAidSession?.liveUrl,
        status: legalAidSession?.status ?? null,
      },
    ],
    [formsSession, deadlineSession, defenseSession, legalAidSession],
  );

  const effectiveBrowserTab = useMemo(
    () => resolveEffectiveBrowserTab(browserTabs, selectedBrowserAgentId),
    [browserTabs, selectedBrowserAgentId],
  );

  const visibleActivityFeed = useMemo(() => {
    if (!effectiveBrowserTab) return [];
    return activityFeed.filter((item) => item.agentId === effectiveBrowserTab.agentId);
  }, [activityFeed, effectiveBrowserTab]);

  const ud105FillSource = useMemo(() => {
    const poll = formsNavigatorResult?.ud105;
    const fromPoll = poll?.pdfBase64?.trim();
    if (fromPoll && poll) {
      return {
        pdfBase64: fromPoll,
        revisionLabel: poll.revisionLabel ?? null,
      };
    }
    const art = formArtifacts.find(
      (a) => a.formCode === "UD-105" && a.variant === "original",
    );
    if (!art) return null;
    const b64 = extractBase64FromPdfDataUrl(art.downloadUrl);
    if (!b64) return null;
    return {
      pdfBase64: b64,
      revisionLabel: art.revisionLabel ?? null,
    };
  }, [formsNavigatorResult?.ud105, formArtifacts]);

  const handleFillUd105 = useCallback(async () => {
    const id = params.id;
    if (!id || !caseContext || !ud105FillSource) return;
    await runUd105PdfFill({
      appSessionId: id,
      caseContext,
      pdfBase64: ud105FillSource.pdfBase64,
      revisionLabel: ud105FillSource.revisionLabel,
      addFormArtifact,
      setPdfFillState,
    });
  }, [
    params.id,
    caseContext,
    ud105FillSource,
    addFormArtifact,
    setPdfFillState,
  ]);

  const fillUd105Disabled = !caseContext || !ud105FillSource;

  // Hydrate sessions from sessionStorage on mount
  useEffect(() => {
    const id = params.id;
    if (!id) return;
    const raw = sessionStorage.getItem(intakeStorageKey(id));
    if (!raw) return;
    let payload = parseIntakeSessionPayload(raw);
    if (!payload) return;

    const anySession =
      Boolean(payload.formsNavigatorSession?.sessionId) ||
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

    setTrackedFormsSession({
      appSessionId: id,
      browserSessionId: payload.formsNavigatorSession?.sessionId ?? null,
    });
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
      setTrackedFormsSession(null);
      setTrackedSession(null);
      setTrackedDefenseSession(null);
      setTrackedLegalAidSession(null);
    };
  }, [
    params.id,
    setCaseContext,
    setTrackedFormsSession,
    setTrackedSession,
    setTrackedDefenseSession,
    setTrackedLegalAidSession,
  ]);

  // Wire forms navigator output into downloadable artifacts.
  useEffect(() => {
    const ud105 = formsNavigatorResult?.ud105;
    if (ud105?.pdfBase64) {
      addFormArtifact({
        formCode: "UD-105",
        variant: "original",
        fileName: ud105.fileName,
        downloadUrl: `data:application/pdf;base64,${ud105.pdfBase64}`,
        revisionLabel: ud105.revisionLabel ?? undefined,
      });
    }

    const fw001 = formsNavigatorResult?.fw001;
    if (fw001?.pdfBase64) {
      addFormArtifact({
        formCode: "FW-001",
        variant: "original",
        fileName: fw001.fileName,
        downloadUrl: `data:application/pdf;base64,${fw001.pdfBase64}`,
        revisionLabel: fw001.revisionLabel ?? undefined,
      });
    }
  }, [addFormArtifact, formsNavigatorResult?.fw001, formsNavigatorResult?.ud105]);

  // Wire deadline result into case context
  useEffect(() => {
    setDeadlineResult(polledDeadlineResult);

    if (polledDeadlineResult?.status === "needs_input") {
      const missingFacts = polledDeadlineResult.missingFacts;
      const factsLabel = missingFacts
        .map((fact) => fact.replace(/_/g, " "))
        .join(", ");

      setHitlGate({
        isBlockedOnUser: true,
        instruction: factsLabel
          ? `We need a few more details to calculate your response deadline: ${factsLabel}.`
          : "We need more case details before we can calculate your response deadline.",
        missingFacts,
      });
      return;
    }

    setHitlGate({
      isBlockedOnUser: false,
      instruction: null,
      missingFacts: [],
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
      formsNavigatorSession:
        data.formsNavigatorSession ?? payload.formsNavigatorSession,
      deadlineTrackerSession:
        data.deadlineTrackerSession ?? payload.deadlineTrackerSession,
      defenseResearchSession:
        data.defenseResearchSession ?? payload.defenseResearchSession,
      legalAidSession: data.legalAidSession ?? payload.legalAidSession,
    };

    const hasAnySession =
      Boolean(next.formsNavigatorSession?.sessionId) ||
      Boolean(next.deadlineTrackerSession?.sessionId) ||
      Boolean(next.defenseResearchSession?.sessionId) ||
      Boolean(next.legalAidSession?.sessionId);
    next.dispatched = hasAnySession;

    sessionStorage.setItem(intakeStorageKey(id), JSON.stringify(next));

    setTrackedFormsSession({
      appSessionId: id,
      browserSessionId: next.formsNavigatorSession?.sessionId ?? null,
    });
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

  async function handleHitlSubmit(updates: Partial<CaseFacts>) {
    if (!caseContext) return;

    const enriched = {
      ...caseContext,
      caseFacts: { ...caseContext.caseFacts, ...updates },
      // Remove facts that the user just provided from the missing list
      missingFacts: caseContext.missingFacts.filter(
        (f) => !Object.keys(updates).some((k) => k === f || k.replace(/([A-Z])/g, "_$1").toLowerCase() === f),
      ),
    };

    setCaseContext(enriched);

    // Persist enriched context so polling picks it up after re-dispatch
    const id = params.id;
    if (id) {
      const raw = sessionStorage.getItem(intakeStorageKey(id));
      const payload = parseIntakeSessionPayload(raw ?? "");
      if (payload) {
        sessionStorage.setItem(
          intakeStorageKey(id),
          JSON.stringify({ ...payload, caseContext: enriched }),
        );
      }
    }

    // Re-run only the deadline agent with the enriched context
    await handleDispatchWave1(["deadline"]);
  }

  return (
    <main className="flex min-h-dvh flex-col gap-4 p-4">
      <SessionViewToggle activeView={activeView} onViewChange={setActiveView} />

      {activeView === "browser" ? (
        <section className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
          <BrowserPanel
            tabs={browserTabs}
            effectiveTab={effectiveBrowserTab}
            onSelectAgentId={setSelectedBrowserAgentId}
          />
          <ActivityStrip
            items={visibleActivityFeed}
            contextLabel={effectiveBrowserTab?.label ?? null}
          />
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
                milestones: deadlineResult?.milestones ?? [],
              }}
            />

            {hitlGate.isBlockedOnUser ? (
              <HitlGate
                instruction={hitlGate.instruction ?? "Complete the required task to continue."}
                missingFacts={hitlGate.missingFacts}
                onSubmit={handleHitlSubmit}
              />
            ) : (
              <ActionItemsPanel
                model={{
                  checklist: actionItems,
                  formArtifacts,
                }}
                pdfFillStatus={pdfFillState.status}
                pdfFillErrorCode={pdfFillState.errorCode}
                pdfFillErrorMessage={pdfFillState.errorMessage}
                onFillUd105={handleFillUd105}
                fillUd105Disabled={fillUd105Disabled}
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
