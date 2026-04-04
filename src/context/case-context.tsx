"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CaseFacts,
  DeadlineResult,
  DefenseItem,
  LegalAidItem,
  ActionChecklistItem,
  FormArtifact,
  HitlGateState,
  IntakeSessionPayload,
} from "@/lib/types";

interface CaseContextValue {
  caseFacts: CaseFacts | null;
  setCaseFacts: (facts: CaseFacts | null) => void;
  intakeMeta: Omit<IntakeSessionPayload, "caseFacts"> | null;
  setIntakeMeta: (meta: CaseContextValue["intakeMeta"]) => void;
  deadlineResult: DeadlineResult | null;
  defenses: DefenseItem[];
  legalAid: LegalAidItem[];
  actionItems: ActionChecklistItem[];
  formArtifacts: FormArtifact[];
  hitlGate: HitlGateState;
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [caseFacts, setCaseFacts] = useState<CaseFacts | null>(null);
  const [intakeMeta, setIntakeMeta] = useState<
    Omit<IntakeSessionPayload, "caseFacts"> | null
  >(null);

  const value = useMemo<CaseContextValue>(
    () => ({
      caseFacts,
      setCaseFacts,
      intakeMeta,
      setIntakeMeta,
      deadlineResult: null,
      defenses: [],
      legalAid: [],
      actionItems: [],
      formArtifacts: [],
      hitlGate: {
        isBlockedOnUser: false,
        instruction: null,
      },
    }),
    [caseFacts, intakeMeta],
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
