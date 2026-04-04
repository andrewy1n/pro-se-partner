"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { BrowserPanel } from "@/components/browser-panel";
import { ActivityStrip } from "@/components/activity-strip";
import { CaseFactsPanel } from "@/components/dashboard/case-facts-panel";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { ActionItemsPanel } from "@/components/dashboard/action-items-panel";
import { ResourcesPanel } from "@/components/dashboard/resources-panel";
import { HitlGate } from "@/components/hitl-gate";
import { useSession } from "@/context/session-context";
import { useCaseContext } from "@/context/case-context";
import { intakeStorageKey, parseIntakeSessionPayload } from "@/lib/intake-storage";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const {
    activeSession,
    activityFeed,
    deadlineResult: polledDeadlineResult,
    setTrackedSession,
  } = useSession();
  const {
    caseFacts,
    setCaseFacts,
    intakeMeta,
    setIntakeMeta,
    setDeadlineResult,
    setHitlGate,
    hitlGate,
    actionItems,
    formArtifacts,
    defenses,
    legalAid,
    deadlineResult,
  } = useCaseContext();

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    const raw = sessionStorage.getItem(intakeStorageKey(id));
    if (!raw) return;
    const payload = parseIntakeSessionPayload(raw);
    if (!payload) return;
    setCaseFacts(payload.caseFacts);
    setIntakeMeta({
      confidence: payload.confidence,
      missingFields: payload.missingFields,
      needsHumanReview: payload.needsHumanReview,
      deadlineTrackerSession: payload.deadlineTrackerSession ?? null,
      parsedDocumentFields: payload.parsedDocumentFields ?? null,
      uploadedFileName: payload.uploadedFileName ?? null,
      documentParseError: payload.documentParseError ?? null,
    });
    setTrackedSession({
      appSessionId: id,
      browserSessionId: payload.deadlineTrackerSession?.sessionId ?? null,
    });

    return () => {
      setTrackedSession(null);
    };
  }, [params.id, setCaseFacts, setIntakeMeta, setTrackedSession]);

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

  return (
    <main className="grid min-h-screen grid-cols-1 gap-4 p-4 lg:grid-cols-5">
      <section className="space-y-4 lg:col-span-3">
        <BrowserPanel
          liveUrl={activeSession?.liveUrl}
          activeAgentId={activeSession?.activeAgentId ?? null}
        />
        <ActivityStrip items={activityFeed} />
      </section>

      <section className="space-y-4 lg:col-span-2">
        <CaseFactsPanel caseFacts={caseFacts} intakeMeta={intakeMeta} />

        <StatusPanel
          model={{
            countdownLabel: deadlineResult?.responseDeadline ?? "TBD",
            caseStage: activeSession?.stage ?? "stage-1-intake",
            callToAction: hitlGate.instruction,
            consequenceSummary: deadlineResult?.consequenceSummary ?? null,
            projectedTrialWindow: deadlineResult?.projectedTrialWindow ?? null,
            citations: deadlineResult?.citations ?? [],
            missingFacts: deadlineResult?.missingFacts ?? [],
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

        <ResourcesPanel
          model={{
            defenses,
            legalAid,
          }}
        />
      </section>

      <p className="sr-only">Session id: {params.id}</p>
      {/* TODO: Populate dashboard panels progressively in completion order. */}
      {/* TODO: Implement active live session switching from Wave 1 to Stage 2 Agent 9. */}
    </main>
  );
}
