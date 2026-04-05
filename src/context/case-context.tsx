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
  EfilingResult,
  LegalAidItem,
  ActionChecklistItem,
  FormArtifact,
  HitlGateState,
  PdfFillState,
} from "@/lib/types";

interface CaseContextValue {
  caseContext: CanonicalCaseContext | null;
  setCaseContext: (context: CanonicalCaseContext | null) => void;
  deadlineResult: DeadlineResult | null;
  setDeadlineResult: (result: DeadlineResult | null) => void;
  defenses: DefenseItem[];
  setDefenses: (items: DefenseItem[]) => void;
  legalAid: LegalAidItem[];
  setLegalAid: (items: LegalAidItem[]) => void;
  actionItems: ActionChecklistItem[];
  formArtifacts: FormArtifact[];
  addFormArtifact: (artifact: FormArtifact) => void;
  hitlGate: HitlGateState;
  setHitlGate: (state: HitlGateState) => void;
  pdfFillState: PdfFillState;
  setPdfFillState: (state: PdfFillState) => void;
  efilingResult: EfilingResult | null;
  setEfilingResult: (result: EfilingResult | null) => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [caseContext, setCaseContext] = useState<CanonicalCaseContext | null>(null);
  const [deadlineResult, setDeadlineResult] = useState<DeadlineResult | null>(null);
  const [defenses, setDefenses] = useState<DefenseItem[]>([]);
  const [legalAid, setLegalAid] = useState<LegalAidItem[]>([]);
  const [formArtifacts, setFormArtifacts] = useState<FormArtifact[]>([]);
  const [hitlGate, setHitlGate] = useState<HitlGateState>({
    isBlockedOnUser: false,
    instruction: null,
    missingFacts: [],
  });
  const [pdfFillState, setPdfFillState] = useState<PdfFillState>({
    status: "idle",
    errorCode: null,
    errorMessage: null,
  });
  const [efilingResult, setEfilingResult] = useState<EfilingResult | null>(null);

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
      defenses,
      setDefenses,
      legalAid,
      setLegalAid,
      actionItems: [],
      formArtifacts,
      addFormArtifact,
      hitlGate,
      setHitlGate,
      pdfFillState,
      setPdfFillState,
      efilingResult,
      setEfilingResult,
    }),
    [
      caseContext,
      deadlineResult,
      defenses,
      legalAid,
      formArtifacts,
      addFormArtifact,
      hitlGate,
      pdfFillState,
      efilingResult,
    ],
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
