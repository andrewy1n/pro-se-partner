import { useState, type ReactNode } from "react";
import type { CanonicalCaseContext, ParsedDocumentFields } from "@/lib/types";
import { formatCaseFactDisplay } from "@/lib/format-case-fact-display";
import { filterDisplayAllegations } from "@/lib/document-summary-display";
import { CollapsibleSection } from "@/components/collapsible-section";
import {
  Home,
  Scale,
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  Edit2,
  Mail,
  Hash,
  Building2,
  User,
  Users,
  ListChecks,
  AlertTriangle,
  Gavel,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

function hasAnyAllegationLists(n: ParsedDocumentFields["normalizedExtraction"]): boolean {
  return (
    (n.allegations?.length ?? 0) > 0 ||
    (n.tenancyAllegations?.length ?? 0) > 0 ||
    (n.noticeAllegations?.length ?? 0) > 0 ||
    (n.serviceAllegations?.length ?? 0) > 0 ||
    (n.rentalAssistanceAllegations?.length ?? 0) > 0 ||
    (n.reliefRequested?.length ?? 0) > 0
  );
}

function parsedDocumentHasContent(p: ParsedDocumentFields): boolean {
  const n = p.normalizedExtraction;
  return (
    p.validationWarnings.length > 0 ||
    n.caseNumber != null ||
    n.courtName != null ||
    n.plaintiffName != null ||
    n.defendantName != null ||
    n.landlordName != null ||
    n.claimedAmount != null ||
    n.serviceDate != null ||
    n.noticeServiceDate != null ||
    n.noticeExpirationDate != null ||
    n.noticeType != null ||
    n.serviceMethod != null ||
    n.propertyAddress != null ||
    n.documentType != null ||
    n.proceedingStage != null ||
    hasAnyAllegationLists(n)
  );
}

interface CaseFactsPanelProps {
  caseContext: CanonicalCaseContext | null;
  /** Narrow column: tighter typography, single-column grid. */
  variant?: "default" | "sidebar";
}

export function CaseFactsPanel({ caseContext, variant = "default" }: CaseFactsPanelProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const caseFacts = caseContext?.caseFacts ?? null;
  if (!caseFacts) return null;

  const parsed = caseContext?.parsedDocumentFields;
  const n = parsed?.normalizedExtraction;

  const structuredAllegationCount = n
    ? (n.tenancyAllegations?.length ?? 0) +
      (n.noticeAllegations?.length ?? 0) +
      (n.serviceAllegations?.length ?? 0) +
      (n.rentalAssistanceAllegations?.length ?? 0) +
      (n.reliefRequested?.length ?? 0)
    : 0;

  const tenancyD = n ? filterDisplayAllegations(n.tenancyAllegations) : [];
  const noticeD = n ? filterDisplayAllegations(n.noticeAllegations) : [];
  const serviceD = n ? filterDisplayAllegations(n.serviceAllegations) : [];
  const rentalD = n ? filterDisplayAllegations(n.rentalAssistanceAllegations) : [];
  const reliefD = n ? filterDisplayAllegations(n.reliefRequested) : [];
  const factualFlatDisplay = [...tenancyD, ...noticeD, ...serviceD, ...rentalD];
  const legacyFlatDisplay = n ? filterDisplayAllegations(n.allegations) : [];

  const hasDisplayableAllegations =
    factualFlatDisplay.length > 0 ||
    reliefD.length > 0 ||
    (structuredAllegationCount === 0 && legacyFlatDisplay.length > 0);

  const compact = variant === "sidebar";
  const gridClass = `grid grid-cols-2 gap-x-3 gap-y-3 text-sm ${compact ? "max-w-full" : ""}`;

  return (
    <section
      className={`app-card ${compact ? "max-h-[min(70vh,560px)] overflow-y-auto" : ""}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          className="flex flex-1 items-center gap-1.5 text-left"
        >
          {panelOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          )}
          <h2 className="font-display text-base font-semibold tracking-tight text-stone-900">
            Your Situation
          </h2>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-card transition-colors hover:bg-stone-50"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {panelOpen && (
      <div>
      {caseContext?.needsHumanReview && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Review suggested: Some facts may be incomplete or unclear.
        </div>
      )}

      {caseContext?.conflicts.length ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <div className="mb-1 font-medium text-amber-800">Source conflicts to review</div>
          <ul className="list-inside list-disc space-y-1 text-amber-900/90">
            {caseContext.conflicts.map((conflict) => (
              <li key={`${conflict.field}-${conflict.resolution}`}>
                {conflict.field}: intake {String(conflict.intakeValue ?? "unknown")}, document{" "}
                {String(conflict.documentValue ?? "unknown")}.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={gridClass}>
        <div>
          <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
            <Home className="h-3.5 w-3.5" />
            <span className="text-xs">Eviction Type</span>
          </div>
          <p className="text-stone-800">
            {formatCaseFactDisplay(caseFacts.evictionType)}
          </p>
        </div>

        <div>
          <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
            <Scale className="h-3.5 w-3.5" />
            <span className="text-xs">Current Stage</span>
          </div>
          <p className="text-stone-800">
            {formatCaseFactDisplay(caseFacts.proceedingStage)}
          </p>
        </div>

        <div>
          <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-xs">Notice Type</span>
          </div>
          <p className="text-stone-800">
            {formatCaseFactDisplay(caseFacts.noticeType)}
          </p>
        </div>

        <div>
          <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">Service Date</span>
          </div>
          <p className="text-stone-800">
            {formatCaseFactDisplay(caseFacts.serviceDate)}
          </p>
        </div>

        <div>
          <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
            <Mail className="h-3.5 w-3.5" />
            <span className="text-xs">Service Method</span>
          </div>
          <p className="text-stone-800">
            {formatCaseFactDisplay(caseFacts.serviceMethod)}
          </p>
        </div>

        <div>
          <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-xs">Amount Claimed</span>
          </div>
          <p className="text-stone-800">
            {caseFacts.claimedAmount !== null
              ? `$${caseFacts.claimedAmount.toFixed(2)}`
              : "Unknown"}
          </p>
        </div>

        <div className="col-span-2">
          <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">Jurisdiction</span>
          </div>
          <p className="text-stone-800">
            {formatCaseFactDisplay(caseFacts.jurisdiction)}
          </p>
        </div>
      </div>

      {(caseContext?.uploadedFileName ||
        caseContext?.documentParseError ||
        parsed) && (
        <CollapsibleSection
          label={`Parsed document fields${parsed && parsedDocumentHasContent(parsed) ? ` (${caseContext?.uploadedFileName ?? "uploaded file"})` : ""}`}
          defaultOpen={false}
          className="mt-4 border-t border-[#E5E7EB] pt-4"
        >
          {caseContext?.uploadedFileName && (
            <p className="mt-1 text-xs text-stone-500">
              File:{" "}
              <span className="text-stone-700">{caseContext.uploadedFileName}</span>
            </p>
          )}
          {caseContext?.documentParseError && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Document parsing did not complete: {caseContext.documentParseError}. The
              facts from your description above are still available.
            </div>
          )}
          {parsed && !caseContext?.documentParseError && parsed.validationWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Validation checks
              </div>
              <ul className="list-inside list-disc space-y-1 text-amber-900/90">
                {parsed.validationWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed && !caseContext?.documentParseError && !parsedDocumentHasContent(parsed) && (
            <p className="mt-2 text-xs text-stone-500">
              No extractable case details were found in this file. You can still use
              the summary from your description.
            </p>
          )}
          {parsed && n && !caseContext?.documentParseError && parsedDocumentHasContent(parsed) && (
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
                <ParsedDocField
                  icon={<Gavel className="h-3.5 w-3.5" />}
                  label="Document type"
                  value={formatCaseFactDisplay(n.documentType)}
                />
                <ParsedDocField
                  icon={<Scale className="h-3.5 w-3.5" />}
                  label="Stage (document)"
                  value={formatCaseFactDisplay(n.proceedingStage)}
                />
                <ParsedDocField
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Case number"
                  value={formatCaseFactDisplay(n.caseNumber)}
                />
                <ParsedDocField
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Court"
                  value={formatCaseFactDisplay(n.courtName)}
                />
                <ParsedDocField
                  icon={<User className="h-3.5 w-3.5" />}
                  label="Plaintiff (labeled)"
                  value={formatCaseFactDisplay(n.plaintiffName)}
                />
                <ParsedDocField
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Defendant (labeled)"
                  value={formatCaseFactDisplay(n.defendantName)}
                />
                <ParsedDocField
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Property address"
                  value={formatCaseFactDisplay(n.propertyAddress)}
                />
                <ParsedDocField
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Notice type (document)"
                  value={formatCaseFactDisplay(n.noticeType)}
                />
                <ParsedDocField
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Notice service date"
                  value={formatCaseFactDisplay(n.noticeServiceDate)}
                />
                <ParsedDocField
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Notice expiration"
                  value={formatCaseFactDisplay(n.noticeExpirationDate)}
                />
                <ParsedDocField
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Service method"
                  value={formatCaseFactDisplay(n.serviceMethod)}
                />
                <ParsedDocField
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Service date (summary)"
                  value={formatCaseFactDisplay(n.serviceDate)}
                />
                <div>
                  <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-xs">Amount claimed (document)</span>
                  </div>
                  <p className="text-stone-800">
                    {n.claimedAmount !== null
                      ? `$${n.claimedAmount.toFixed(2)}`
                      : "Unknown"}
                  </p>
                </div>
              </div>
              {hasAnyAllegationLists(n) && hasDisplayableAllegations && (
                <div className="space-y-4">
                  <div className="mb-0.5 flex items-center gap-1.5 text-stone-500">
                    <ListChecks className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Allegations from complaint
                    </span>
                  </div>
                  {structuredAllegationCount === 0 && legacyFlatDisplay.length > 0 && (
                    <ul className="list-inside list-disc space-y-1 text-stone-800">
                      {legacyFlatDisplay.map((line, i) => (
                        <li key={`${i}-${line.slice(0, 32)}`} className="text-sm">
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                  {structuredAllegationCount > 0 && (
                    <>
                      <AllegationGroupBlock
                        title="Tenancy and agreement"
                        items={tenancyD}
                      />
                      <AllegationGroupBlock title="Notice" items={noticeD} />
                      <AllegationGroupBlock
                        title="Notice service and compliance"
                        items={serviceD}
                      />
                      <AllegationGroupBlock
                        title="Rental assistance / certifications"
                        items={rentalD}
                      />
                      <AllegationGroupBlock title="Relief requested" items={reliefD} />
                    </>
                  )}
                  {structuredAllegationCount > 0 && factualFlatDisplay.length > 0 && (
                    <CollapsibleSection
                      label={`Factual allegations — full order (${factualFlatDisplay.length} items)`}
                      defaultOpen={false}
                      className="rounded-lg border border-[#E5E7EB] bg-stone-50 p-2"
                    >
                      <p className="mt-1 text-[11px] text-stone-500">
                        Tenancy through rental assistance only; relief is listed above.
                      </p>
                      <ol className="mt-2 list-inside list-decimal space-y-1.5 text-stone-700">
                        {factualFlatDisplay.map((line, i) => (
                          <li key={`${i}-${line.slice(0, 32)}`} className="text-sm">
                            {line}
                          </li>
                        ))}
                      </ol>
                    </CollapsibleSection>
                  )}
                </div>
              )}

              <CollapsibleSection
                label="Raw extraction (JSON)"
                defaultOpen={false}
                className="rounded-lg border border-[#E5E7EB] bg-stone-50 p-2"
              >
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-stone-500">
                  {JSON.stringify(parsed.rawExtraction, null, 2)}
                </pre>
              </CollapsibleSection>
            </div>
          )}
        </CollapsibleSection>
      )}
      </div>
      )}
    </section>
  );
}

function ParsedDocField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-stone-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-stone-800">{value}</p>
    </div>
  );
}

function AllegationGroupBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-medium text-stone-600">{title}</h4>
      <ul className="list-inside list-disc space-y-1 text-stone-800">
        {items.map((line, i) => (
          <li key={`${i}-${line.slice(0, 32)}`} className="text-sm">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
