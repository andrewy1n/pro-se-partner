"use client";
import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Clock, X } from "lucide-react";
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
      <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
        <Clock className="h-5 w-5 shrink-0 text-zinc-500" />
        <div>
          <p className="text-sm font-medium text-zinc-300">Deadline pending</p>
          <p className="text-xs text-zinc-500">Calculating based on your case facts…</p>
        </div>
      </div>
    );
  }

  const urgency =
    days <= 3
      ? { border: "border-red-800", bg: "bg-red-950/50", icon: "text-red-400", label: "text-red-300", sub: "text-red-400/70" }
      : days <= 7
      ? { border: "border-amber-800", bg: "bg-amber-950/50", icon: "text-amber-400", label: "text-amber-200", sub: "text-amber-400/70" }
      : { border: "border-zinc-700", bg: "bg-zinc-900", icon: "text-zinc-400", label: "text-zinc-200", sub: "text-zinc-500" };

  const dayWord = days === 1 ? "day" : "days";
  const urgencyLabel =
    days < 0
      ? "Deadline passed"
      : days === 0
      ? "Due today"
      : `${days} ${dayWord} to respond`;

  return (
    <div className={`flex items-center gap-3 rounded-lg border ${urgency.border} ${urgency.bg} px-4 py-3`}>
      <AlertCircle className={`h-5 w-5 shrink-0 ${urgency.icon}`} />
      <div>
        <p className={`text-base font-bold ${urgency.label}`}>{urgencyLabel}</p>
        <p className={`text-xs ${urgency.sub}`}>Answer deadline: {formattedDate}</p>
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
  const isUrgent = days !== null && days <= 3;
  const isWarning = days !== null && days > 3 && days <= 7;

  const dotColor =
    status === "past"
      ? "bg-zinc-600 border-zinc-600"
      : isUrgent
      ? "bg-red-500 border-red-500"
      : isWarning
      ? "bg-amber-500 border-amber-500"
      : status === "current"
      ? "bg-blue-500 border-blue-500"
      : "bg-transparent border-zinc-600";

  const labelColor =
    status === "past"
      ? "text-zinc-400"
      : isUrgent
      ? "text-red-300 font-semibold"
      : isWarning
      ? "text-amber-300 font-semibold"
      : status === "current"
      ? "text-zinc-100 font-semibold"
      : "text-zinc-300";

  const dateDisplay = milestone.dateLabel ?? formatIsoDate(milestone.date) ?? "—";

  return (
    <div className="flex gap-3">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div className={`mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 ${dotColor} ${status === "current" && !isUrgent && !isWarning ? "ring-2 ring-blue-500/30" : ""}`} />
        {!isLast && <div className="mt-1 w-0.5 flex-1 bg-zinc-800" />}
      </div>

      {/* Content */}
      <div className={`${isLast ? "" : "pb-5"} min-w-0`}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-sm ${labelColor}`}>{milestone.label}</span>
          <span className="text-xs text-zinc-500">{dateDisplay}</span>
        </div>
        {milestone.description && (
          <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{milestone.description}</p>
        )}
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
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        {panelOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        )}
        <h2 className="text-sm font-medium text-zinc-200">Status &amp; Timeline</h2>
      </button>

      {efilingConfirmation ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-green-700 bg-green-950/40 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-300">Response Filed Successfully</p>
            {efilingConfirmation.confirmationNumber ? (
              <p className="mt-0.5 text-xs text-green-400/80">
                Confirmation: {efilingConfirmation.confirmationNumber}
              </p>
            ) : null}
            {efilingConfirmation.submittedAt ? (
              <p className="text-xs text-green-400/60">
                Submitted: {new Date(efilingConfirmation.submittedAt).toLocaleString()}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs text-green-400/60">
              Trial date will be set within 20 days.
            </p>
          </div>
        </div>
      ) : null}

      {hitlAction ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <p className="text-xs text-amber-100/90">
              Action required — we need a bit more information to calculate your deadline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHitlModalOpen(true)}
            className="shrink-0 rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
          >
            Provide details
          </button>
        </div>
      ) : null}

      {panelOpen && (
        <div className="mt-3 space-y-4">
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
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Timeline will populate when the Deadline Tracker finishes.</span>
            </div>
          ) : null}

          {/* Consequence callout */}
          {model?.consequenceSummary && (
            <div className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2">
              <p className="text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">If missed: </span>
                {model.consequenceSummary}
              </p>
            </div>
          )}

          {/* Missing facts */}
          {model?.missingFacts.length ? (
            <p className="text-xs text-zinc-500">Still needed: {model.missingFacts.join(", ")}</p>
          ) : null}

          {/* Call to action */}
          {model?.callToAction && (
            <p className="text-xs text-zinc-300">Next step: {model.callToAction}</p>
          )}

          {/* Sources */}
          {model?.citations.length ? (
            <CollapsibleSection
              label={`Sources (${model.citations.length})`}
              defaultOpen={false}
              className="border-t border-zinc-800 pt-3"
            >
              <div className="space-y-2 text-sm text-zinc-300">
                {model.citations.map((citation) => (
                  <p key={`${citation.title}-${citation.url ?? "local"}`}>
                    {citation.url ? (
                      <a
                        className="text-blue-300 underline underline-offset-2"
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hitl-modal-title"
        onClick={() => setHitlModalOpen(false)}
      >
        <div
          className="flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
            <h2 id="hitl-modal-title" className="text-sm font-medium text-zinc-100">
              Action required
            </h2>
            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Close"
              onClick={() => setHitlModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
