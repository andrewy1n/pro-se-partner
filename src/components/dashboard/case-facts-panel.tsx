import type { CaseFacts, IntakeSessionPayload } from "@/lib/types";
import { formatCaseFactDisplay } from "@/lib/format-case-fact-display";
import {
  Home,
  Scale,
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  Edit2,
  Mail,
} from "lucide-react";

interface CaseFactsPanelProps {
  caseFacts: CaseFacts | null;
  intakeMeta: Omit<IntakeSessionPayload, "caseFacts"> | null;
}

export function CaseFactsPanel({ caseFacts, intakeMeta }: CaseFactsPanelProps) {
  if (!caseFacts) return null;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Your Situation</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Please verify we understood your situation correctly.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
          <Edit2 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {intakeMeta?.needsHumanReview && (
        <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500">
          Review suggested: Some facts may be incomplete or unclear.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
            <Home className="h-3.5 w-3.5" />
            <span className="text-xs">Eviction Type</span>
          </div>
          <p className="text-zinc-200">
            {formatCaseFactDisplay(caseFacts.evictionType)}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
            <Scale className="h-3.5 w-3.5" />
            <span className="text-xs">Current Stage</span>
          </div>
          <p className="text-zinc-200">
            {formatCaseFactDisplay(caseFacts.proceedingStage)}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-xs">Notice Type</span>
          </div>
          <p className="text-zinc-200">
            {formatCaseFactDisplay(caseFacts.noticeType)}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">Service Date</span>
          </div>
          <p className="text-zinc-200">
            {formatCaseFactDisplay(caseFacts.serviceDate)}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
            <Mail className="h-3.5 w-3.5" />
            <span className="text-xs">Service Method</span>
          </div>
          <p className="text-zinc-200">
            {formatCaseFactDisplay(caseFacts.serviceMethod)}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-xs">Amount Claimed</span>
          </div>
          <p className="text-zinc-200">
            {caseFacts.claimedAmount !== null
              ? `$${caseFacts.claimedAmount.toFixed(2)}`
              : "Unknown"}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">Jurisdiction</span>
          </div>
          <p className="text-zinc-200">
            {formatCaseFactDisplay(caseFacts.jurisdiction)}
          </p>
        </div>
      </div>
    </section>
  );
}
