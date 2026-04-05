"use client";

import { useMemo, useState } from "react";
import type { CanonicalCaseContext, Wave1AgentKey } from "@/lib/types";
import { WAVE1_AGENT_KEYS_ALL } from "@/lib/types";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Bot, Loader2, PlayCircle } from "lucide-react";

interface Wave1DispatchPanelProps {
  caseContext: CanonicalCaseContext | null;
  onDispatchWave1: (agents: Wave1AgentKey[]) => Promise<void>;
}

export function Wave1DispatchPanel({ caseContext, onDispatchWave1 }: Wave1DispatchPanelProps) {
  const [isDispatching, setIsDispatching] = useState(false);
  const [runForms, setRunForms] = useState(true);
  const [runDeadline, setRunDeadline] = useState(true);
  const [runDefense, setRunDefense] = useState(true);
  const [runLegalAid, setRunLegalAid] = useState(true);

  const selectedAgents = useMemo((): Wave1AgentKey[] => {
    const keys: Wave1AgentKey[] = [];
    if (runForms) keys.push("forms");
    if (runDeadline) keys.push("deadline");
    if (runDefense) keys.push("defense");
    if (runLegalAid) keys.push("legalAid");
    return keys;
  }, [runForms, runDeadline, runDefense, runLegalAid]);

  const allSelected = selectedAgents.length === WAVE1_AGENT_KEYS_ALL.length;

  async function handleDispatchClick() {
    if (isDispatching || selectedAgents.length === 0) return;
    setIsDispatching(true);
    try {
      await onDispatchWave1(selectedAgents);
    } finally {
      setIsDispatching(false);
    }
  }

  if (!caseContext?.caseFacts) return null;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-start gap-2">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Wave 1 agents</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Runs browser research using the facts summarized in{" "}
            <span className="text-zinc-400">Your Situation</span> below.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDispatchClick}
        disabled={isDispatching || selectedAgents.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDispatching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting research...
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4" />
            {allSelected ? "Run analysis" : `Run selected (${selectedAgents.length})`}
          </>
        )}
      </button>

      <CollapsibleSection
        label="Advanced — choose agents"
        defaultOpen={false}
        className="mt-3"
      >
        <p className="mb-2 text-[11px] text-zinc-500">
          Leave all selected to run the full Wave 1. Uncheck agents you do not want to launch.
        </p>
        <div className="space-y-2 text-sm text-zinc-300">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={runForms}
              onChange={(e) => setRunForms(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Forms Navigator
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={runDeadline}
              onChange={(e) => setRunDeadline(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Deadline Tracker
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={runDefense}
              onChange={(e) => setRunDefense(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Defense Research
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={runLegalAid}
              onChange={(e) => setRunLegalAid(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Legal Aid
          </label>
        </div>
      </CollapsibleSection>
    </section>
  );
}
