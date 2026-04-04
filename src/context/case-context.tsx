"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CanonicalCaseContext,
  DeadlineResult,
  DefenseItem,
  LegalAidItem,
  ActionChecklistItem,
  FormArtifact,
  HitlGateState,
} from "@/lib/types";

interface CaseContextValue {
  caseContext: CanonicalCaseContext | null;
  setCaseContext: (context: CanonicalCaseContext | null) => void;
  deadlineResult: DeadlineResult | null;
  setDeadlineResult: (result: DeadlineResult | null) => void;
  defenses: DefenseItem[];
  legalAid: LegalAidItem[];
  actionItems: ActionChecklistItem[];
  formArtifacts: FormArtifact[];
  hitlGate: HitlGateState;
  setHitlGate: (state: HitlGateState) => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [caseContext, setCaseContext] = useState<CanonicalCaseContext | null>(null);
  const [deadlineResult, setDeadlineResult] = useState<DeadlineResult | null>(null);
  const [hitlGate, setHitlGate] = useState<HitlGateState>({
    isBlockedOnUser: false,
    instruction: null,
  });

  const value = useMemo<CaseContextValue>(
    () => ({
      caseContext,
      setCaseContext,
      deadlineResult,
      setDeadlineResult,
      defenses: [],
      legalAid: [],
      actionItems: [],
      formArtifacts: [],
      hitlGate,
      setHitlGate,
    }),
    [caseContext, deadlineResult, hitlGate],
  );

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCaseContext() {
  const ctx = useContext(CaseContext);
  if (!ctx) {
    throw new Error("useCaseContext must be used inside CaseProvider");
  }
  return ctx;
}
