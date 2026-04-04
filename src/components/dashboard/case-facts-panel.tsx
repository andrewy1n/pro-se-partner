import type { ReactNode } from "react";
import type { CaseFacts, IntakeSessionPayload, ParsedDocumentFields } from "@/lib/types";
import { formatCaseFactDisplay } from "@/lib/format-case-fact-display";
import { filterDisplayAllegations } from "@/lib/document-summary-display";
import {
  Home,
  Scale,
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  Edit2,
  Hash,
  Building2,
  User,
  Users,
  ListChecks,
  AlertTriangle,
  Gavel,
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
  caseFacts: CaseFacts | null;
  intakeMeta: Omit<IntakeSessionPayload, "caseFacts"> | null;
}

export function CaseFactsPanel({ caseFacts, intakeMeta }: CaseFactsPanelProps) {
  if (!caseFacts) return null;

  const parsed = intakeMeta?.parsedDocumentFields;
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
            <span className="text-xs">Date Received</span>
          </div>
          <p className="text-zinc-200">
            {formatCaseFactDisplay(caseFacts.serviceDate)}
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

      {(intakeMeta?.uploadedFileName ||
        intakeMeta?.documentParseError ||
        parsed) && (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            From your uploaded document
          </h3>
          {intakeMeta?.uploadedFileName && (
            <p className="mt-1 text-xs text-zinc-500">
              File:{" "}
              <span className="text-zinc-300">{intakeMeta.uploadedFileName}</span>
            </p>
          )}
          {intakeMeta?.documentParseError && (
            <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500">
              Document parsing did not complete: {intakeMeta.documentParseError}. The
              facts from your description above are still available.
            </div>
          )}
          {parsed && !intakeMeta?.documentParseError && parsed.validationWarnings.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Validation checks
              </div>
              <ul className="list-inside list-disc space-y-1 text-amber-200/90">
                {parsed.validationWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed && !intakeMeta?.documentParseError && !parsedDocumentHasContent(parsed) && (
            <p className="mt-2 text-xs text-zinc-500">
              No extractable case details were found in this file. You can still use
              the summary from your description.
            </p>
          )}
          {parsed && n && !intakeMeta?.documentParseError && parsedDocumentHasContent(parsed) && (
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
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
                  <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-xs">Amount claimed (document)</span>
                  </div>
                  <p className="text-zinc-200">
                    {n.claimedAmount !== null
                      ? `$${n.claimedAmount.toFixed(2)}`
                      : "Unknown"}
                  </p>
                </div>
              </div>
              {hasAnyAllegationLists(n) && hasDisplayableAllegations && (
                <div className="space-y-4">
                  <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
                    <ListChecks className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Allegations from complaint
                    </span>
                  </div>
                  {structuredAllegationCount === 0 && legacyFlatDisplay.length > 0 && (
                    <ul className="list-inside list-disc space-y-1 text-zinc-200">
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
                    <details className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">
                      <summary className="cursor-pointer text-zinc-400">
                        Factual allegations — full order ({factualFlatDisplay.length} items)
                      </summary>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Tenancy through rental assistance only; relief is listed above.
                      </p>
                      <ol className="mt-2 list-inside list-decimal space-y-1.5 text-zinc-300">
                        {factualFlatDisplay.map((line, i) => (
                          <li key={`${i}-${line.slice(0, 32)}`} className="text-sm">
                            {line}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              )}

              <details className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">
                <summary className="cursor-pointer text-zinc-400">Raw extraction (JSON)</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-zinc-500">
                  {JSON.stringify(parsed.rawExtraction, null, 2)}
                </pre>
              </details>
            </div>
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
      <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-zinc-200">{value}</p>
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
      <h4 className="mb-1.5 text-xs font-medium text-zinc-400">{title}</h4>
      <ul className="list-inside list-disc space-y-1 text-zinc-200">
        {items.map((line, i) => (
          <li key={`${i}-${line.slice(0, 32)}`} className="text-sm">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
