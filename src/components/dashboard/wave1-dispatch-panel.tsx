"use client";

import { useMemo, useState } from "react";
import type { CanonicalCaseContext, Wave1AgentKey } from "@/lib/types";
import { WAVE1_AGENT_KEYS_ALL } from "@/lib/types";
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
    <section className="app-card">
      <div className="mb-3 flex items-start gap-2">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-stone-900">
            Case Analysis
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Researches your case and prepares your court forms.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-stone-500">Include in this run:</p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-stone-600">
          <input
            type="checkbox"
            checked={runForms}
            onChange={(e) => setRunForms(e.target.checked)}
            className="h-3.5 w-3.5 shrink-0 rounded border-stone-300 text-indigo-600 focus:ring-indigo-600"
          />
          Forms
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-stone-600">
          <input
            type="checkbox"
            checked={runDeadline}
            onChange={(e) => setRunDeadline(e.target.checked)}
            className="h-3.5 w-3.5 shrink-0 rounded border-stone-300 text-indigo-600 focus:ring-indigo-600"
          />
          Deadline
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-stone-600">
          <input
            type="checkbox"
            checked={runDefense}
            onChange={(e) => setRunDefense(e.target.checked)}
            className="h-3.5 w-3.5 shrink-0 rounded border-stone-300 text-indigo-600 focus:ring-indigo-600"
          />
          Defenses
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-stone-600">
          <input
            type="checkbox"
            checked={runLegalAid}
            onChange={(e) => setRunLegalAid(e.target.checked)}
            className="h-3.5 w-3.5 shrink-0 rounded border-stone-300 text-indigo-600 focus:ring-indigo-600"
          />
          Legal aid
        </label>
      </div>

      <button
        type="button"
        onClick={handleDispatchClick}
        disabled={isDispatching || selectedAgents.length === 0}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDispatching ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Starting research...
          </>
        ) : (
          <>
            <PlayCircle className="h-3.5 w-3.5" />
            {allSelected ? "Analyze My Case" : `Analyze selected (${selectedAgents.length})`}
          </>
        )}
      </button>
    </section>
  );
}
