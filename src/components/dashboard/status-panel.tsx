"use client";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  X,
} from "lucide-react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { HitlGate } from "@/components/hitl-gate";
import type { CaseFacts, EfilingResult, StatusPanelModel, TimelineMilestone } from "@/lib/types";

interface StatusPanelProps {
  model: StatusPanelModel | null;
  /** Deadline HITL: opens from a button in this panel; form lives in a modal. */
  hitlAction?: {
    instruction: string;
    missingFacts: string[];
    complaintReferenceDateIso?: string | null;
    onSubmit: (updates: Partial<CaseFacts>) => void | Promise<void>;
  } | null;
  /** Show after Wave 2 e-filing agent returns a confirmation. */
  efilingConfirmation?: Pick<EfilingResult, "confirmationNumber" | "submittedAt"> | null;
}

function computeDaysRemaining(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const deadline = new Date(isoDate);
  if (Number.isNaN(deadline.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatIsoDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getMilestoneStatus(m: TimelineMilestone): "past" | "current" | "future" {
  if (!m.date) return "future";
  const days = computeDaysRemaining(m.date);
  if (days === null) return "future";
  if (days < 0) return "past";
  if (days <= 1) return "current";
  return "future";
}

interface CountdownBadgeProps {
  responseDeadline: string | null;
  countdownLabel: string;
}

function CountdownBadge({ responseDeadline, countdownLabel }: CountdownBadgeProps) {
  const days = computeDaysRemaining(responseDeadline);
  const formattedDate = formatIsoDate(responseDeadline) ?? countdownLabel;

  if (days === null) {
    return (
      <div className="flex items-start gap-3 rounded-r-xl border border-[#E5E7EB] border-l-4 border-l-indigo-600 bg-white py-4 pl-4 pr-4 shadow-card">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Deadline pending</p>
          <p className="text-xs text-stone-600">Calculating based on your case facts…</p>
        </div>
      </div>
    );
  }

  const dayWord = days === 1 ? "day" : "days";
  const urgencyLabel =
    days < 0
      ? "Deadline passed"
      : days === 0
        ? "Due today"
        : `${days} ${dayWord} to respond`;

  if (days < 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-card">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
        <div>
          <p className="text-base font-bold text-red-800">{urgencyLabel}</p>
          <p className="text-xs text-red-700/90">Answer deadline: {formattedDate}</p>
        </div>
      </div>
    );
  }

  if (days <= 7) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-card">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="text-base font-bold text-amber-950">{urgencyLabel}</p>
          <p className="text-xs text-amber-900/90">Answer deadline: {formattedDate}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-card">
      <AlertCircle className="h-5 w-5 shrink-0 text-indigo-600" />
      <div>
        <p className="text-base font-bold text-indigo-900">{urgencyLabel}</p>
        <p className="text-xs text-indigo-800/90">Answer deadline: {formattedDate}</p>
      </div>
    </div>
  );
}

interface TimelineNodeProps {
  milestone: TimelineMilestone;
  isLast: boolean;
  responseDeadline: string | null;
}

function TimelineNode({ milestone, isLast, responseDeadline }: TimelineNodeProps) {
  const status = getMilestoneStatus(milestone);
  const isAnswerDeadline = milestone.date !== null && milestone.date === responseDeadline;
  const days = isAnswerDeadline ? computeDaysRemaining(milestone.date) : null;
  const isUrgent = days !== null && days >= 0 && days <= 7;
  const isPassed = days !== null && days < 0;

  const dateDisplay = milestone.dateLabel ?? formatIsoDate(milestone.date) ?? "—";

  let icon: ReactNode;
  if (status === "past" || isPassed) {
    icon = <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} aria-hidden />;
  } else if (status === "current") {
    if (isUrgent) {
      icon = <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />;
    } else {
      icon = (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-indigo-600 bg-white"
          aria-hidden
        >
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
        </span>
      );
    }
  } else {
    icon = <Circle className="h-5 w-5 shrink-0 text-stone-300" strokeWidth={1.75} aria-hidden />;
  }

  const labelClass =
    status === "past"
      ? "text-stone-600"
      : isUrgent && status === "current"
        ? "font-semibold text-amber-900"
        : status === "current"
          ? "font-semibold text-indigo-900"
          : "text-stone-800";

  return (
    <div className="flex gap-3">
      <div className="flex w-6 shrink-0 flex-col items-center pt-0.5">
        {icon}
        {!isLast ? <div className="mt-2 w-px flex-1 min-h-[1.25rem] bg-[#E5E7EB]" aria-hidden /> : null}
      </div>

      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-6"}`}>
        <div className="flex items-start justify-between gap-4">
          <span className={`text-sm leading-snug ${labelClass}`}>{milestone.label}</span>
          <span className="shrink-0 text-right text-xs tabular-nums text-stone-500">{dateDisplay}</span>
        </div>
        {milestone.description ? (
          <p className="mt-1 text-xs leading-relaxed text-stone-600">{milestone.description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function StatusPanel({ model, hitlAction = null, efilingConfirmation = null }: StatusPanelProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [hitlModalOpen, setHitlModalOpen] = useState(false);

  useEffect(() => {
    if (!hitlAction) setHitlModalOpen(false);
  }, [hitlAction]);

  useEffect(() => {
    if (!hitlModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hitlModalOpen]);

  const hasMilestones = (model?.milestones.length ?? 0) > 0;

  return (
    <Fragment>
    <section className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-8 shadow-card">
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        {panelOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
        )}
        <h2 className="font-display text-lg font-semibold tracking-tight text-stone-900">
          Status &amp; Timeline
        </h2>
      </button>

      {efilingConfirmation ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900">Response Filed Successfully</p>
            {efilingConfirmation.confirmationNumber ? (
              <p className="mt-0.5 text-xs text-emerald-800">
                Confirmation: {efilingConfirmation.confirmationNumber}
              </p>
            ) : null}
            {efilingConfirmation.submittedAt ? (
              <p className="text-xs text-emerald-700/90">
                Submitted: {new Date(efilingConfirmation.submittedAt).toLocaleString()}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs text-emerald-700/90">Trial date will be set within 20 days.</p>
          </div>
        </div>
      ) : null}

      {hitlAction ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
            <p className="text-xs text-indigo-950">
              Action required — we need a bit more information to calculate your deadline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHitlModalOpen(true)}
            className="shrink-0 rounded-lg border border-indigo-600 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-card hover:bg-indigo-50"
          >
            Provide details
          </button>
        </div>
      ) : null}

      {panelOpen && (
        <div className="mt-5 space-y-5">
          {/* Countdown badge — countdownLabel is the ISO deadline date or "TBD" */}
          <CountdownBadge
            responseDeadline={model?.countdownLabel !== "TBD" ? model?.countdownLabel ?? null : null}
            countdownLabel={model?.countdownLabel ?? "TBD"}
          />

          {/* Timeline */}
          {hasMilestones ? (
            <div className="pt-1">
              {model!.milestones.map((m, i) => (
                <TimelineNode
                  key={`${m.label}-${m.date ?? i}`}
                  milestone={m}
                  isLast={i === model!.milestones.length - 1}
                  responseDeadline={model?.countdownLabel !== "TBD" ? model?.countdownLabel ?? null : null}
                />
              ))}
            </div>
          ) : model ? (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Clock className="h-3.5 w-3.5 shrink-0 text-stone-400" />
              <span>Timeline will populate when Response Deadline finishes.</span>
            </div>
          ) : null}

          {/* Consequence callout */}
          {model?.consequenceSummary && (
            <div className="rounded-lg border border-[#E5E7EB] bg-stone-50 px-3 py-2">
              <p className="text-xs text-stone-600">
                <span className="font-medium text-stone-800">If missed: </span>
                {model.consequenceSummary}
              </p>
            </div>
          )}

          {/* Missing facts */}
          {model?.missingFacts.length ? (
            <p className="text-xs text-stone-500">Still needed: {model.missingFacts.join(", ")}</p>
          ) : null}

          {/* Call to action */}
          {model?.callToAction && (
            <p className="text-xs text-stone-700">Next step: {model.callToAction}</p>
          )}

          {/* Sources */}
          {model?.citations.length ? (
            <CollapsibleSection
              label={`Sources (${model.citations.length})`}
              defaultOpen={false}
              className="border-t border-[#E5E7EB] pt-3"
            >
              <div className="space-y-2 text-sm text-stone-700">
                {model.citations.map((citation) => (
                  <p key={`${citation.title}-${citation.url ?? "local"}`}>
                    {citation.url ? (
                      <a
                        className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
                        href={citation.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {citation.title}
                      </a>
                    ) : (
                      citation.title
                    )}
                  </p>
                ))}
              </div>
            </CollapsibleSection>
          ) : null}
        </div>
      )}
    </section>

    {hitlModalOpen && hitlAction ? (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hitl-modal-title"
        onClick={() => setHitlModalOpen(false)}
      >
        <div
          className="flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5E7EB] bg-white px-4 py-3">
            <h2
              id="hitl-modal-title"
              className="font-display text-base font-semibold text-indigo-900"
            >
              Action required
            </h2>
            <button
              type="button"
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800"
              aria-label="Close"
              onClick={() => setHitlModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <HitlGate
              key={hitlAction.missingFacts.join("|")}
              instruction={hitlAction.instruction}
              missingFacts={hitlAction.missingFacts}
              complaintReferenceDateIso={hitlAction.complaintReferenceDateIso}
              onSubmit={hitlAction.onSubmit}
              embedInModal
            />
          </div>
        </div>
      </div>
    ) : null}
    </Fragment>
  );
}
