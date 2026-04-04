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
  ParsedDocumentFields,
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
  parsedDocumentFields: ParsedDocumentFields | null;
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
  const [caseFacts, setCaseFacts] = useState<CaseFacts | null>(null);
  const [intakeMeta, setIntakeMeta] = useState<
    Omit<IntakeSessionPayload, "caseFacts"> | null
  >(null);
  const [deadlineResult, setDeadlineResult] = useState<DeadlineResult | null>(null);
  const [hitlGate, setHitlGate] = useState<HitlGateState>({
    isBlockedOnUser: false,
    instruction: null,
  });

  const value = useMemo<CaseContextValue>(
    () => ({
      caseFacts,
      setCaseFacts,
      intakeMeta,
      setIntakeMeta,
      parsedDocumentFields: null,
      deadlineResult,
      setDeadlineResult,
      defenses: [],
      legalAid: [],
      actionItems: [],
      formArtifacts: [],
      hitlGate,
      setHitlGate,
    }),
    [caseFacts, deadlineResult, hitlGate, intakeMeta],
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
