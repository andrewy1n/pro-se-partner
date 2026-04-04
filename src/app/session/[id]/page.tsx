"use client";

import { useParams } from "next/navigation";
import { BrowserPanel } from "@/components/browser-panel";
import { ActivityStrip } from "@/components/activity-strip";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { ActionItemsPanel } from "@/components/dashboard/action-items-panel";
import { ResourcesPanel } from "@/components/dashboard/resources-panel";
import { HitlGate } from "@/components/hitl-gate";
import { useSession } from "@/context/session-context";
import { useCaseContext } from "@/context/case-context";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const { activeSession, activityFeed } = useSession();
  const { hitlGate, actionItems, formArtifacts, defenses, legalAid, deadlineResult } =
    useCaseContext();

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
        <StatusPanel
          model={{
            countdownLabel: deadlineResult?.responseDeadline ?? "TBD",
            caseStage: activeSession?.stage ?? "stage-1-intake",
            progressSteps: [],
            callToAction: hitlGate.instruction,
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
