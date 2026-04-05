"use client";

import {
  createContext,
  useContext,
  useCallback,
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
  PdfFillStatus,
  PdfFillErrorCode,
} from "@/lib/types";

interface PdfFillState {
  status: PdfFillStatus;
  errorCode: PdfFillErrorCode | null;
  errorMessage: string | null;
}

interface CaseContextValue {
  caseContext: CanonicalCaseContext | null;
  setCaseContext: (context: CanonicalCaseContext | null) => void;
  deadlineResult: DeadlineResult | null;
  setDeadlineResult: (result: DeadlineResult | null) => void;
  defenses: DefenseItem[];
  legalAid: LegalAidItem[];
  actionItems: ActionChecklistItem[];
  formArtifacts: FormArtifact[];
  addFormArtifact: (artifact: FormArtifact) => void;
  hitlGate: HitlGateState;
  setHitlGate: (state: HitlGateState) => void;
  pdfFillState: PdfFillState;
  setPdfFillState: (state: PdfFillState) => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

const INITIAL_FILL_STATE: PdfFillState = {
  status: "idle",
  errorCode: null,
  errorMessage: null,
};

export function CaseProvider({ children }: { children: ReactNode }) {
  const [caseContext, setCaseContext] = useState<CanonicalCaseContext | null>(null);
  const [deadlineResult, setDeadlineResult] = useState<DeadlineResult | null>(null);
  const [formArtifacts, setFormArtifacts] = useState<FormArtifact[]>([]);
  const [hitlGate, setHitlGate] = useState<HitlGateState>({
    isBlockedOnUser: false,
    instruction: null,
  });
  const [pdfFillState, setPdfFillState] = useState<PdfFillState>(INITIAL_FILL_STATE);

  const addFormArtifact = useCallback((artifact: FormArtifact) => {
    setFormArtifacts((prev) => {
      const without = prev.filter(
        (a) => !(a.formCode === artifact.formCode && a.variant === artifact.variant),
      );
      return [...without, artifact];
    });
  }, []);

  const value = useMemo<CaseContextValue>(
    () => ({
      caseContext,
      setCaseContext,
      deadlineResult,
      setDeadlineResult,
      defenses: [],
      legalAid: [],
      actionItems: [],
      formArtifacts,
      addFormArtifact,
      hitlGate,
      setHitlGate,
      pdfFillState,
      setPdfFillState,
    }),
    [caseContext, deadlineResult, formArtifacts, addFormArtifact, hitlGate, pdfFillState],
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
