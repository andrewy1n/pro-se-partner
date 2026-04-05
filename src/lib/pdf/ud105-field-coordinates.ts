/**
 * Coordinate map for drawing text onto UD-105 (Answer — Unlawful Detainer).
 * pdf-lib: origin bottom-left, points. Pages: US Letter 612×792.
 *
 * Positions extracted from the PDF's own /Subtype /Widget annotations
 * (/Rect [x1, y1, x2, y2]). For drawText, x1+2 / y1+2 are used as the
 * text baseline position. These are pixel-perfect field positions defined
 * by Adobe/LiveCycle when the form was created.
 */

export interface Ud105FieldCoord {
  name: string;
  page: number;
  x: number;
  y: number;
  fontSize?: number;
  maxWidth?: number;
  isCheckbox?: boolean;
}

export const UD105_FIELDS: Ud105FieldCoord[] = [
  // ===== PAGE 0 — ATTORNEY/PARTY HEADER =====
  { name: "attorneyName",       page: 0, x: 58,  y: 723, fontSize: 9 },
  { name: "barNumber",          page: 0, x: 309, y: 734, fontSize: 9 },
  { name: "firmName",           page: 0, x: 74,  y: 711, fontSize: 9 },
  { name: "streetAddress",      page: 0, x: 96,  y: 700, fontSize: 9 },
  { name: "city",               page: 0, x: 55,  y: 688, fontSize: 9 },
  { name: "state",              page: 0, x: 264, y: 688, fontSize: 9 },
  { name: "zipCode",            page: 0, x: 327, y: 688, fontSize: 9 },
  { name: "telephone",          page: 0, x: 90,  y: 677, fontSize: 9 },
  { name: "fax",                page: 0, x: 266, y: 677, fontSize: 9 },
  { name: "email",              page: 0, x: 91,  y: 665, fontSize: 9 },
  { name: "attorneyFor",        page: 0, x: 108, y: 654, fontSize: 9 },

  // ===== PAGE 0 — COURT INFO =====
  { name: "courtCounty",        page: 0, x: 228, y: 638, fontSize: 9 },
  { name: "courtStreetAddress",  page: 0, x: 97,  y: 628, fontSize: 9 },
  { name: "courtMailingAddress", page: 0, x: 97,  y: 617, fontSize: 9 },
  { name: "courtCityZip",       page: 0, x: 97,  y: 606, fontSize: 9 },
  { name: "courtBranch",        page: 0, x: 97,  y: 594, fontSize: 9 },

  // ===== PAGE 0 — PARTIES + CASE NUMBER =====
  { name: "plaintiffName",      page: 0, x: 90,  y: 579, fontSize: 9 },
  { name: "defendantName",      page: 0, x: 90,  y: 566, fontSize: 9 },
  { name: "caseNumber",         page: 0, x: 400, y: 538, fontSize: 9 },

  // ===== PAGE 0 — ITEM 1 =====
  { name: "defendantItem1",     page: 0, x: 50,  y: 502, fontSize: 9, maxWidth: 520 },

  // ===== PAGE 0 — ITEM 2 DENIALS =====
  { name: "denial_2a",          page: 0, x: 72,  y: 453, fontSize: 10, isCheckbox: true },
  { name: "denial_2b",          page: 0, x: 72,  y: 424, fontSize: 10, isCheckbox: true },

  // ===== PAGE 0 — ITEM 3 DEFENSES =====
  { name: "defense_a",          page: 0, x: 72,  y: 182, fontSize: 10, isCheckbox: true },
  { name: "defense_b",          page: 0, x: 72,  y: 168, fontSize: 10, isCheckbox: true },
  { name: "defense_c",          page: 0, x: 72,  y: 142, fontSize: 10, isCheckbox: true },
  { name: "defense_c_date",     page: 0, x: 241, y: 141, fontSize: 9 },
  { name: "defense_d",          page: 0, x: 72,  y: 116, fontSize: 10, isCheckbox: true },
  { name: "defense_e",          page: 0, x: 72,  y: 101, fontSize: 10, isCheckbox: true },
  { name: "defense_f",          page: 0, x: 72,  y: 87,  fontSize: 10, isCheckbox: true },

  // ===== PAGE 1 — HEADER =====
  { name: "plaintiffName_p2",   page: 1, x: 90,  y: 734, fontSize: 9 },
  { name: "caseNumber_p2",      page: 1, x: 400, y: 720, fontSize: 9 },
  { name: "defendantName_p2",   page: 1, x: 90,  y: 720, fontSize: 9 },

  // ===== PAGE 1 — DEFENSE CHECKBOXES =====
  { name: "defense_g",          page: 1, x: 72,  y: 698, fontSize: 10, isCheckbox: true },
  { name: "defense_h",          page: 1, x: 72,  y: 672, fontSize: 10, isCheckbox: true },
  { name: "defense_h_ordinance",page: 1, x: 228, y: 661, fontSize: 8, maxWidth: 345 },
  { name: "defense_i",          page: 1, x: 72,  y: 635, fontSize: 10, isCheckbox: true },
  { name: "defense_i1",         page: 1, x: 90,  y: 611, fontSize: 10, isCheckbox: true },
  { name: "defense_i2",         page: 1, x: 90,  y: 597, fontSize: 10, isCheckbox: true },
  { name: "defense_i3",         page: 1, x: 90,  y: 570, fontSize: 10, isCheckbox: true },
  { name: "defense_i4",         page: 1, x: 92,  y: 555, fontSize: 10, isCheckbox: true },
  { name: "defense_i5",         page: 1, x: 90,  y: 532, fontSize: 10, isCheckbox: true },
  { name: "defense_j",          page: 1, x: 72,  y: 513, fontSize: 10, isCheckbox: true },
  { name: "defense_k",          page: 1, x: 72,  y: 497, fontSize: 10, isCheckbox: true },
  { name: "defense_k1",         page: 1, x: 91,  y: 408, fontSize: 10, isCheckbox: true },
  { name: "defense_k2",         page: 1, x: 91,  y: 393, fontSize: 10, isCheckbox: true },
  { name: "defense_l",          page: 1, x: 72,  y: 367, fontSize: 10, isCheckbox: true },
  { name: "defense_m",          page: 1, x: 72,  y: 329, fontSize: 10, isCheckbox: true },
  { name: "defense_m1",         page: 1, x: 91,  y: 304, fontSize: 10, isCheckbox: true },
  { name: "defense_m2",         page: 1, x: 91,  y: 268, fontSize: 10, isCheckbox: true },
  { name: "defense_m3",         page: 1, x: 91,  y: 233, fontSize: 10, isCheckbox: true },
  { name: "defense_n",          page: 1, x: 72,  y: 206, fontSize: 10, isCheckbox: true },
  { name: "defense_o",          page: 1, x: 72,  y: 191, fontSize: 10, isCheckbox: true },
  { name: "defense_p",          page: 1, x: 72,  y: 118, fontSize: 10, isCheckbox: true },
  { name: "defense_p1",         page: 1, x: 91,  y: 93,  fontSize: 10, isCheckbox: true },
  { name: "defense_p2",         page: 1, x: 91,  y: 80,  fontSize: 10, isCheckbox: true },

  // ===== PAGE 2 — HEADER =====
  { name: "plaintiffName_p3",   page: 2, x: 90,  y: 734, fontSize: 9 },
  { name: "caseNumber_p3",      page: 2, x: 400, y: 720, fontSize: 9 },
  { name: "defendantName_p3",   page: 2, x: 90,  y: 720, fontSize: 9 },

  // ===== PAGE 2 — REMAINING DEFENSES =====
  { name: "defense_q",          page: 2, x: 72,  y: 690, fontSize: 10, isCheckbox: true },
  { name: "defense_r",          page: 2, x: 72,  y: 675, fontSize: 10, isCheckbox: true },
  { name: "defense_s",          page: 2, x: 72,  y: 648, fontSize: 10, isCheckbox: true },

  // ===== PAGE 2 — ITEM 3t FACTS (large text area) =====
  { name: "defenseFacts_3t",    page: 2, x: 66,  y: 610, fontSize: 8, maxWidth: 505 },

  // ===== PAGE 2 — ITEM 4 =====
  { name: "vacatedDate",        page: 2, x: 267, y: 480, fontSize: 9 },

  // ===== PAGE 2 — ITEM 5 REQUESTS =====
  { name: "request_c",          page: 2, x: 72,  y: 255, fontSize: 10, isCheckbox: true },
  { name: "request_d",          page: 2, x: 72,  y: 240, fontSize: 10, isCheckbox: true },
  { name: "request_e",          page: 2, x: 72,  y: 212, fontSize: 10, isCheckbox: true },

  // ===== PAGE 2 — ITEM 6 =====
  { name: "pagesAttached",      page: 2, x: 250, y: 89,  fontSize: 9 },

  // ===== PAGE 3 — HEADER =====
  { name: "plaintiffName_p4",   page: 3, x: 90,  y: 734, fontSize: 9 },
  { name: "caseNumber_p4",      page: 3, x: 400, y: 720, fontSize: 9 },
  { name: "defendantName_p4",   page: 3, x: 90,  y: 720, fontSize: 9 },

  // ===== PAGE 3 — ITEM 7 UD ASSISTANT =====
  { name: "udAssistant_didNot", page: 3, x: 327, y: 678, fontSize: 10, isCheckbox: true },
  { name: "udAssistant_did",    page: 3, x: 392, y: 678, fontSize: 10, isCheckbox: true },

  // ===== PAGE 3 — SIGNATURES =====
  { name: "signatureName1",     page: 3, x: 36,  y: 522, fontSize: 10 },

  // ===== PAGE 3 — VERIFICATION =====
  { name: "verificationDate1",  page: 3, x: 60,  y: 332, fontSize: 10 },
  { name: "verificationName1",  page: 3, x: 36,  y: 311, fontSize: 10 },
];
