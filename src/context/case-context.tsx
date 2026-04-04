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
} from "@/lib/types";

interface CaseContextValue {
  caseFacts: CaseFacts | null;
  parsedDocumentFields: ParsedDocumentFields | null;
  deadlineResult: DeadlineResult | null;
  defenses: DefenseItem[];
  legalAid: LegalAidItem[];
  actionItems: ActionChecklistItem[];
  formArtifacts: FormArtifact[];
  hitlGate: HitlGateState;
  // TODO: Add reducers/selectors for stage transitions and panel hydration order.
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [caseFacts] = useState<CaseFacts | null>(null);

  const value = useMemo<CaseContextValue>(
    () => ({
      caseFacts,
      parsedDocumentFields: null,
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
    [caseFacts],
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
