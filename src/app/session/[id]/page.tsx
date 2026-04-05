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
import { useSession } from "@/context/session-context";
import { useCaseContext } from "@/context/case-context";
import {
  intakeStorageKey,
  parseIntakeSessionPayload,
  parseIntakeSessionPayloadOrNew,
} from "@/lib/intake-storage";
import { resolveEffectiveBrowserTab } from "@/lib/browser-panel-tabs";
import {
  extractBase64FromPdfDataUrl,
  runUd105PdfFill,
} from "@/lib/client-ud105-fill";
import type {
  AgentId,
  CanonicalCaseContext,
  CaseFacts,
  DispatchWave1Response,
  DispatchWave2Response,
  IntakeSessionPayload,
  Wave1AgentKey,
} from "@/lib/types";
import {
  buildSummonsServiceHitlInstruction,
  getComplaintReferenceDateIso,
  hitlFactsNeedSummonsDateClarification,
} from "@/lib/hitl-summons-service";

const DEADLINE_CRITICAL_FACTS = ["service_date", "service_method"];

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const [dispatched, setDispatched] = useState(false);
  const [activeView, setActiveView] = useState<SessionView>("browser");
  const autoSwitchedRef = useRef(false);
  const [selectedBrowserAgentId, setSelectedBrowserAgentId] = useState<AgentId | null>(null);
  const [isEfilingDispatching, setIsEfilingDispatching] = useState(false);

  const {
    activeSession,
    formsSession,
    deadlineSession,
    defenseSession,
    legalAidSession,
    efilingSession,
    activityFeed,
    formsNavigatorResult,
    deadlineResult: polledDeadlineResult,
    defenseResult: polledDefenseResult,
    legalAidResult: polledLegalAidResult,
    efilingResult: polledEfilingResult,
    isPolling,
    setTrackedFormsSession,
    setTrackedSession,
    setTrackedDefenseSession,
    setTrackedLegalAidSession,
    setTrackedEfilingSession,
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
    efilingResult,
    setEfilingResult,
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
      {
        agentId: "agent-9-efiling" as const,
        label: "E-Filing",
        liveUrl: efilingSession?.liveUrl,
        status: efilingSession?.status ?? null,
      },
    ],
    [formsSession, deadlineSession, defenseSession, legalAidSession, efilingSession],
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

  const statusMissingFacts = useMemo(() => {
    const serviceComplete =
      caseContext?.caseFacts.serviceDate != null &&
      caseContext?.caseFacts.serviceMethod != null;
    if (
      serviceComplete &&
      deadlineResult?.status === "needs_input" &&
      (deadlineResult.missingFacts?.length ?? 0) > 0
    ) {
      return caseContext?.missingFacts ?? [];
    }
    if (deadlineResult?.missingFacts?.length) {
      return deadlineResult.missingFacts;
    }
    return caseContext?.missingFacts ?? [];
  }, [
    caseContext?.caseFacts.serviceDate,
    caseContext?.caseFacts.serviceMethod,
    caseContext?.missingFacts,
    deadlineResult?.missingFacts,
    deadlineResult?.status,
  ]);

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

    if (payload.efilingSession?.sessionId) {
      setTrackedEfilingSession({
        appSessionId: id,
        browserSessionId: payload.efilingSession.sessionId,
      });
    }

    return () => {
      setTrackedFormsSession(null);
      setTrackedSession(null);
      setTrackedDefenseSession(null);
      setTrackedLegalAidSession(null);
      setTrackedEfilingSession(null);
    };
  }, [
    params.id,
    setCaseContext,
    setTrackedFormsSession,
    setTrackedSession,
    setTrackedDefenseSession,
    setTrackedLegalAidSession,
    setTrackedEfilingSession,
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

  // Wire deadline result from Browser Use polling only (no session id → no sync).
  useEffect(() => {
    if (!deadlineSession?.sessionId) {
      return;
    }

    setDeadlineResult(polledDeadlineResult);

    if (polledDeadlineResult?.status === "needs_input") {
      const serviceDateOk = caseContext?.caseFacts.serviceDate != null;
      const serviceMethodOk = caseContext?.caseFacts.serviceMethod != null;
      if (serviceDateOk && serviceMethodOk) {
        setHitlGate({
          isBlockedOnUser: false,
          instruction: null,
          missingFacts: [],
          complaintReferenceDateIso: null,
        });
        return;
      }

      const missingFacts = polledDeadlineResult.missingFacts;
      const factsLabel = missingFacts
        .map((fact) => fact.replace(/_/g, " "))
        .join(", ");

      const useSummonsCopy =
        caseContext && hitlFactsNeedSummonsDateClarification(missingFacts);

      setHitlGate({
        isBlockedOnUser: true,
        instruction: useSummonsCopy
          ? buildSummonsServiceHitlInstruction(caseContext, "post-agent")
          : factsLabel
            ? `We need a few more details to calculate your response deadline: ${factsLabel}.`
            : "We need more case details before we can calculate your response deadline.",
        missingFacts,
        complaintReferenceDateIso: getComplaintReferenceDateIso(caseContext ?? null),
      });
      return;
    }

    setHitlGate({
      isBlockedOnUser: false,
      instruction: null,
      missingFacts: [],
      complaintReferenceDateIso: null,
    });
  }, [
    polledDeadlineResult,
    deadlineSession?.sessionId,
    caseContext,
    caseContext?.caseFacts.serviceDate,
    caseContext?.caseFacts.serviceMethod,
    setDeadlineResult,
    setHitlGate,
  ]);

  // Wire defense result into case context
  useEffect(() => {
    if (polledDefenseResult) setDefenses(polledDefenseResult);
  }, [polledDefenseResult, setDefenses]);

  // Wire legal aid result into case context
  useEffect(() => {
    if (polledLegalAidResult) setLegalAid(polledLegalAidResult);
  }, [polledLegalAidResult, setLegalAid]);

  // Wire e-filing result into case context
  useEffect(() => {
    if (polledEfilingResult) setEfilingResult(polledEfilingResult);
  }, [polledEfilingResult, setEfilingResult]);

  // After PDF fill completes, push the filled bytes to the server cache so the e-filing agent can fetch them
  useEffect(() => {
    if (pdfFillState.status !== "done") return;
    const filled = formArtifacts.find(
      (a) => a.formCode === "UD-105" && a.variant === "filled",
    );
    if (!filled || !params.id) return;
    const b64 = extractBase64FromPdfDataUrl(filled.downloadUrl);
    if (!b64) return;
    void fetch(`/api/sessions/${params.id}/filled-ud105`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfBase64: b64 }),
    });
  }, [pdfFillState.status, formArtifacts, params.id]);

  // Auto-switch to dashboard once polling settles after Wave 1 activity (once)
  useEffect(() => {
    if (!isPolling && dispatched && !autoSwitchedRef.current) {
      autoSwitchedRef.current = true;
      setActiveView("dashboard");
    }
  }, [isPolling, dispatched]);

  async function handleDispatchWave1(
    agents: Wave1AgentKey[],
    contextOverride?: CanonicalCaseContext,
  ) {
    const id = params.id;
    const ctx = contextOverride ?? caseContext;
    if (!id || !ctx || agents.length === 0) return;

    const res = await fetch("/api/agents/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, caseContext: ctx, agents }),
    });

    if (!res.ok) return;

    const data = (await res.json()) as DispatchWave1Response;

    const raw = sessionStorage.getItem(intakeStorageKey(id));
    const payload = parseIntakeSessionPayloadOrNew(raw, ctx);

    const next: IntakeSessionPayload = {
      ...payload,
      caseContext: ctx,
      formsNavigatorSession:
        data.formsNavigatorSession ?? payload.formsNavigatorSession,
      deadlineTrackerSession:
        data.deadlineTrackerSession ?? payload.deadlineTrackerSession,
      defenseResearchSession:
        data.defenseResearchSession ?? payload.defenseResearchSession,
      legalAidSession: data.legalAidSession ?? payload.legalAidSession,
    };

    const hasAnyBrowserSession =
      Boolean(next.formsNavigatorSession?.sessionId) ||
      Boolean(next.deadlineTrackerSession?.sessionId) ||
      Boolean(next.defenseResearchSession?.sessionId) ||
      Boolean(next.legalAidSession?.sessionId);
    next.dispatched = hasAnyBrowserSession;

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

  async function handleDispatchWithPreCheck(agents: Wave1AgentKey[]) {
    if (!caseContext) return;

    const wantsDeadline = agents.includes("deadline");
    const missingDeadlineFacts = wantsDeadline
      ? DEADLINE_CRITICAL_FACTS.filter((f) => caseContext.missingFacts.includes(f))
      : [];

    if (missingDeadlineFacts.length > 0) {
      const withoutDeadline = agents.filter((a) => a !== "deadline");
      if (withoutDeadline.length > 0) {
        await handleDispatchWave1(withoutDeadline);
      }

      setHitlGate({
        isBlockedOnUser: true,
        instruction: buildSummonsServiceHitlInstruction(caseContext, "pre-dispatch"),
        missingFacts: missingDeadlineFacts,
        complaintReferenceDateIso: getComplaintReferenceDateIso(caseContext),
      });
    } else {
      await handleDispatchWave1(agents);
    }
  }

  async function handleHitlSubmit(updates: Partial<CaseFacts>) {
    if (!caseContext) return;

    const mergedFacts = { ...caseContext.caseFacts, ...updates };
    const enriched: CanonicalCaseContext = {
      ...caseContext,
      caseFacts: mergedFacts,
      missingFacts: caseContext.missingFacts.filter((f) => {
        if (
          (f === "service_date" || f === "serviceDate") &&
          mergedFacts.serviceDate != null &&
          String(mergedFacts.serviceDate).trim() !== ""
        ) {
          return false;
        }
        if (
          (f === "service_method" || f === "serviceMethod") &&
          mergedFacts.serviceMethod != null
        ) {
          return false;
        }
        return !Object.keys(updates).some(
          (k) => k === f || k.replace(/([A-Z])/g, "_$1").toLowerCase() === f,
        );
      }),
    };

    setCaseContext(enriched);

    const id = params.id;
    if (id) {
      const raw = sessionStorage.getItem(intakeStorageKey(id));
      const payload = parseIntakeSessionPayloadOrNew(raw, enriched);
      sessionStorage.setItem(
        intakeStorageKey(id),
        JSON.stringify({ ...payload, caseContext: enriched }),
      );
    }

    setHitlGate({
      isBlockedOnUser: false,
      instruction: null,
      missingFacts: [],
      complaintReferenceDateIso: null,
    });

    await handleDispatchWave1(["deadline"], enriched);
  }

  async function handleDispatchWave2(username: string) {
    const id = params.id;
    if (!id || !caseContext) return;

    const filledArtifact = formArtifacts.find(
      (a) => a.formCode === "UD-105" && a.variant === "filled",
    );
    const pdfBase64 = filledArtifact
      ? extractBase64FromPdfDataUrl(filledArtifact.downloadUrl)
      : null;

    setIsEfilingDispatching(true);
    try {
      const res = await fetch("/api/agents/dispatch-wave2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, efilingUsername: username, caseContext, pdfBase64 }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as DispatchWave2Response;

      const raw = sessionStorage.getItem(intakeStorageKey(id));
      const payload = parseIntakeSessionPayload(raw ?? "");
      if (payload) {
        sessionStorage.setItem(
          intakeStorageKey(id),
          JSON.stringify({ ...payload, efilingSession: data.efilingSession }),
        );
      }

      setTrackedEfilingSession({
        appSessionId: id,
        browserSessionId: data.efilingSession.sessionId,
      });
      setActiveView("browser");
    } finally {
      setIsEfilingDispatching(false);
    }
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
                missingFacts: statusMissingFacts,
                explanation: deadlineResult?.explanation ?? null,
                milestones: deadlineResult?.milestones ?? [],
              }}
              hitlAction={
                hitlGate.isBlockedOnUser
                  ? {
                      instruction:
                        hitlGate.instruction ??
                        "Complete the required task to continue.",
                      missingFacts: hitlGate.missingFacts,
                      complaintReferenceDateIso: hitlGate.complaintReferenceDateIso,
                      onSubmit: handleHitlSubmit,
                    }
                  : null
              }
              efilingConfirmation={efilingResult ?? null}
            />

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
              showEfilingGate={
                !isPolling &&
                dispatched &&
                !efilingResult &&
                (!efilingSession || efilingSession.status === "stopped" || efilingSession.status === "error")
              }
              isEfilingDispatching={isEfilingDispatching}
              onDispatchEfiling={handleDispatchWave2}
            />
          </div>

          <div className="space-y-4">
            <Wave1DispatchPanel caseContext={caseContext} onDispatchWave1={handleDispatchWithPreCheck} />
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
