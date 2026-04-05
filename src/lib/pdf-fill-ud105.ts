// We use a pre-cleaned blank UD-105 bundled in the repo rather than the court-downloaded copy.
// Court PDFs from courts.ca.gov often have broken xref tables that pdf-lib cannot parse. The
// UD-105 is a statewide Judicial Council form, identical everywhere, rarely updated.
// The file in src/lib/pdf/forms/ must load in pdf-lib: if a fresh download fails test-load.mjs,
// run `node scripts/mupdf-clean-ud105.mjs` (or qpdf) and re-verify, then commit.
import { readFileSync } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CanonicalCaseContext } from "@/lib/types";
import { inferDefenses } from "@/lib/pdf/ud105-defense-inference";
import { UD105_FIELDS } from "@/lib/pdf/ud105-field-coordinates";
import { logServerError, logServerEvent } from "@/lib/server-log";

const BLANK_UD105 = readFileSync(
  path.join(process.cwd(), "src", "lib", "pdf", "forms", "ud105-blank.pdf"),
);

export interface Ud105FillResult {
  pdfBytes: Uint8Array;
  missingFields: string[];
  warnings: string[];
}

export function isCorruptPdfStructureError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if (err instanceof Error && err.name === "CorruptPdfStructureError") return true;
  const name = (err as Error).constructor?.name ?? "";
  if (name === "UnexpectedObjectTypeError") return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Expected instance of PDFDict")) return true;
  if (msg.includes("but got instance of undefined")) return true;
  return false;
}

/** Counts "Invalid object ref" substrings in a pdf-lib error message, when present. */
export function countInvalidObjectRefHints(message: string): number | undefined {
  const matches = message.match(/Invalid object ref/gi);
  return matches?.length;
}

function formatServiceMethod(raw: string | null | undefined): string {
  if (!raw) return "";
  const m: Record<string, string> = {
    personal: "Personal service",
    substituted: "Substituted service",
    posted_and_mailed: "Posted and mailed",
  };
  return m[raw] ?? raw;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function str(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function buildCaseDataMap(ctx: CanonicalCaseContext): Record<string, string> {
  const facts = ctx.caseFacts;
  const norm = ctx.parsedDocumentFields?.normalizedExtraction;
  const raw = ctx.parsedDocumentFields?.rawExtraction as Record<string, unknown> | undefined;
  const map: Record<string, string> = {};

  const pickRaw = (...keys: string[]): string => {
    for (const k of keys) {
      const v = raw?.[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  map.plaintiffName = str(norm?.plaintiffName);
  map.defendantName = str(norm?.defendantName);
  map.caseNumber = str(norm?.caseNumber);
  map.caseNumber_ans = map.caseNumber;

  map.plaintiffName_p2 = map.plaintiffName;
  map.plaintiffName_p3 = map.plaintiffName;
  map.plaintiffName_p4 = map.plaintiffName;
  map.defendantName_p2 = map.defendantName;
  map.defendantName_p3 = map.defendantName;
  map.defendantName_p4 = map.defendantName;
  map.caseNumber_p2 = map.caseNumber;
  map.caseNumber_p3 = map.caseNumber;
  map.caseNumber_p4 = map.caseNumber;

  const countyFromJurisdiction = str(facts.jurisdiction).replace(/\s+county\s*$/i, "").trim();
  const courtName = str(norm?.courtName);
  const countyFromCourt = courtName.match(/County of\s+([^,\n]+)/i)?.[1]?.trim() ?? "";
  map.courtCounty =
    pickRaw("courtCounty", "county") || countyFromCourt || countyFromJurisdiction;

  map.courtStreetAddress = pickRaw("courtAddress", "courtStreetAddress");
  map.courtMailingAddress = pickRaw("courtMailingAddress");
  map.courtCityZip = pickRaw("courtCityZip");
  map.courtBranch = pickRaw("courtBranch");

  map.attorneyName = pickRaw("attorneyName") || map.defendantName;
  map.firmName = pickRaw("firmName");
  map.streetAddress =
    pickRaw("defendantAddress", "tenantAddress", "respondentAddress") ||
    str(norm?.propertyAddress) ||
    str(facts.jurisdiction);
  map.city = pickRaw("defendantCity", "tenantCity");
  map.state = pickRaw("defendantState", "tenantState") || "CA";
  map.zipCode = pickRaw("defendantZip", "tenantZip");
  map.telephone = pickRaw("defendantPhone", "tenantPhone", "phone");
  map.fax = pickRaw("fax", "faxNumber");
  map.email = pickRaw("defendantEmail", "tenantEmail", "email");
  map.attorneyFor = pickRaw("attorneyFor") || map.defendantName;

  const propertyAddress = str(norm?.propertyAddress) || str(facts.jurisdiction) || pickRaw("propertyAddress");
  if (propertyAddress) map.propertyAddress = propertyAddress;

  map.defendantItem1 = map.defendantName;

  const noticeType = str(norm?.noticeType) || str(facts.noticeType);
  const served =
    str(norm?.noticeServiceDate) || str(norm?.serviceDate) || str(facts.serviceDate);
  const expires = str(norm?.noticeExpirationDate);
  const sm = str(norm?.serviceMethod) || facts.serviceMethod;
  map.noticeFacts = [
    noticeType ? `Notice type: ${noticeType}` : "",
    served ? `Served: ${served}` : "",
    expires ? `Expires: ${expires}` : "",
    sm ? `Service: ${formatServiceMethod(sm)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const amountNum = norm?.claimedAmount ?? facts.claimedAmount;
  if (amountNum != null && Number.isFinite(amountNum)) {
    map.claimedAmountDisplay = formatCurrency(amountNum);
  } else {
    const s = pickRaw("amountClaimed", "rentDue", "claimedAmountDisplay");
    if (s) map.claimedAmountDisplay = s;
  }

  const amountParsed =
    parseFloat((map.claimedAmountDisplay || "").replace(/[$,]/g, "")) ||
    (typeof amountNum === "number" ? amountNum : 0);
  if (amountParsed > 1000) {
    map.denialType = "specific";
  } else {
    map.denialType = "general";
  }
  map.denial_2a = map.denialType === "general" ? "true" : "";
  map.denial_2b = map.denialType === "specific" ? "true" : "";

  const tenancyBits = [
    ...(norm?.tenancyAllegations ?? []).map((s) => str(s)).filter(Boolean),
    ...(norm?.noticeAllegations ?? []).map((s) => str(s)).filter(Boolean),
  ];
  const tenancySummary =
    tenancyBits[0] ||
    str(norm?.allegations?.[0]) ||
    [facts.evictionType, facts.proceedingStage, facts.noticeType]
      .filter((s): s is string => typeof s === "string" && !!str(s))
      .join(" · ");

  const defenseNarrative = pickRaw("defenseNarrative", "tenantStatement");
  map.defenseFacts_3t = [
    tenancySummary ? `Tenancy / case: ${tenancySummary}` : "",
    map.noticeFacts ? `Notice: ${map.noticeFacts}` : "",
    defenseNarrative ? `Defense: ${defenseNarrative}` : "",
    map.claimedAmountDisplay ? `Amount claimed: ${map.claimedAmountDisplay}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  map.vacatedDate = pickRaw("vacatedDate", "moveOutDate");

  const fairRentalVal = pickRaw("fairRentalValue", "rentalValueChallenge");
  map.fairRentalValue_cb = fairRentalVal ? "true" : "";

  const otherReq = pickRaw("requestOtherText", "otherRequests");
  const otherStmt = pickRaw("otherStatements", "additionalStatements");
  map.otherStatements = [otherStmt, otherReq].filter(Boolean).join("\n\n");
  map.otherStatements_cb = str(map.otherStatements) ? "true" : "";

  const reliefBlob = (norm?.reliefRequested ?? []).join(" ").toLowerCase();
  if (
    pickRaw("requestAttorneyFees") === "true" ||
    /attorney|attorneys.*fee|fees?\s+and\s+costs?|costs?\s+and\s+disburs/i.test(reliefBlob)
  ) {
    map.request_c = "true";
  }
  if (pickRaw("requestRepairs") === "true" || /repair|habitabilit/i.test(reliefBlob)) {
    map.request_d = "true";
  }
  if (
    pickRaw("requestOtherRelief") === "true" ||
    otherReq ||
    /other\s+relief|further\s+relief/i.test(reliefBlob)
  ) {
    map.request_e = "true";
  }

  map.pagesAttached = pickRaw("pagesAttached", "attachmentPageCount") || "1";

  map.udAssistant_didNot = "true";

  map.signatureName1 = map.defendantName;
  map.verificationName1 = map.defendantName;
  map.verificationDate1 =
    pickRaw("verificationDate", "signatureDate") || new Date().toLocaleDateString("en-US");

  map.defense_c_date = pickRaw(
    "defense_c_date",
    "tenderDate",
    "rentOfferDate",
    "noticeServiceDate",
    "serviceDate",
  );
  map.defense_h_ordinance = pickRaw("defense_h_ordinance", "rentOrdinance", "localOrdinance");

  const landlord = str(norm?.landlordName);
  if (landlord && landlord.toLowerCase() !== map.plaintiffName.toLowerCase()) {
    map.defenseFacts_3t = [map.defenseFacts_3t, `Landlord named in documents: ${landlord}`]
      .filter(Boolean)
      .join("\n");
  }

  const defenses = inferDefenses(ctx);
  console.log("INFERRED_DEFENSES:", JSON.stringify(defenses));
  Object.entries(defenses).forEach(([key, checked]) => {
    if (checked) map[key] = "true";
  });

  // DEV ONLY — remove after coordinate verification
  if (process.env.NODE_ENV === "development") {
    const anyDefenseChecked = Object.values(defenses).some(Boolean);
    if (!anyDefenseChecked) {
      map.defense_a = "true";
      map.defense_b = "true";
      map.defense_i = "true";
      map.defense_i2 = "true";
    }
  }

  logServerEvent("fill_ud105_case_context_keys", {
    caseContextKeys: ctx ? Object.keys(ctx) : [],
    caseFacts: ctx.caseFacts,
    parsedDocumentFields: ctx.parsedDocumentFields
      ? {
          validationWarnings: ctx.parsedDocumentFields.validationWarnings,
          normalizedKeys: Object.keys(ctx.parsedDocumentFields.normalizedExtraction ?? {}),
          rawKeys: Object.keys(ctx.parsedDocumentFields.rawExtraction ?? {}),
        }
      : null,
  });

  return map;
}

function checkboxTruthy(v: string | undefined): boolean {
  if (!v) return false;
  const t = v.trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes" || t === "x";
}

/**
 * Fill UD-105 by drawing text at known coordinates. Bypasses AcroForm/XFA entirely.
 * Always draws on the bundled blank PDF (see file header comment).
 */
async function fillByCoordinates(
  caseData: Record<string, string>,
): Promise<{ pdfBytes: Uint8Array; placed: string[]; skipped: string[] }> {
  const doc = await PDFDocument.load(BLANK_UD105, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const placed: string[] = [];
  const skipped: string[] = [];

  for (const field of UD105_FIELDS) {
    const value = caseData[field.name];
    if (!value) {
      skipped.push(field.name);
      continue;
    }
    if (field.page >= pages.length) {
      skipped.push(field.name);
      continue;
    }
    const page = pages[field.page];
    const fontSize = field.fontSize ?? 10;

    if (field.isCheckbox) {
      if (!checkboxTruthy(value)) {
        skipped.push(field.name);
        continue;
      }
      page.drawText("X", {
        x: field.x,
        y: field.y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    } else {
      if (value.includes("\n")) {
        const lines = value.split("\n");
        const lineHeight = (field.fontSize ?? 10) * 1.4;
        lines.forEach((line, i) => {
          if (field.y - i * lineHeight <= 30) return;
          let lineText = line;
          if (field.maxWidth) {
            while (
              lineText.length > 1 &&
              font.widthOfTextAtSize(lineText + "\u2026", fontSize) > field.maxWidth
            ) {
              lineText = lineText.slice(0, -1);
            }
            if (lineText !== line) lineText += "\u2026";
          }
          page.drawText(lineText, {
            x: field.x,
            y: field.y - i * lineHeight,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        });
      } else {
        let text = value;
        if (field.maxWidth) {
          const widthOfFull = font.widthOfTextAtSize(text, fontSize);
          if (widthOfFull > field.maxWidth) {
            while (text.length > 1 && font.widthOfTextAtSize(text + "\u2026", fontSize) > field.maxWidth) {
              text = text.slice(0, -1);
            }
            text += "\u2026";
          }
        }
        page.drawText(text, {
          x: field.x,
          y: field.y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
    placed.push(field.name);
  }

  const savedBytes = await doc.save({
    useObjectStreams: false,
  });
  return { pdfBytes: savedBytes, placed, skipped };
}

/**
 * Primary UD-105 fill: draws text at known page coordinates (no AcroForm interaction).
 * Uses bundled blank PDF bytes; `input.pdfBytes` is accepted for API compatibility but ignored.
 */
export async function fillUd105Pdf({
  caseContext,
  pdfBytes: _courtPdfUnused,
}: {
  pdfBytes: Uint8Array;
  caseContext: CanonicalCaseContext;
}): Promise<Ud105FillResult> {
  void _courtPdfUnused;
  const caseData = buildCaseDataMap(caseContext);
  const missingFields: string[] = [];
  const warnings: string[] = [];

  const allExpected = ["plaintiffName", "defendantName", "caseNumber", "propertyAddress"] as const;
  for (const key of allExpected) {
    if (!caseData[key]) {
      const labels: Record<string, string> = {
        plaintiffName: "Plaintiff / landlord name",
        defendantName: "Defendant / tenant name",
        caseNumber: "Case number",
        propertyAddress: "Property / rental address",
      };
      missingFields.push(labels[key] ?? key);
    }
  }

  try {
    const result = await fillByCoordinates(caseData);

    logServerEvent("fill_pdf_coordinates", {
      placed: result.placed,
      skipped: result.skipped,
      fieldCount: UD105_FIELDS.length,
      defenseCheckboxesPlaced: result.placed.filter((n) => n.startsWith("defense_")),
    });

    return {
      pdfBytes: result.pdfBytes,
      missingFields: [...new Set(missingFields)],
      warnings,
    };
  } catch (err) {
    logServerError("fill_pdf_coordinates_failed", err, {
      caseDataKeys: Object.keys(caseData),
    });
    throw err;
  }
}
