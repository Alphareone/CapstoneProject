import { AUC_LBL, fdate, money, roiText, TYPE_LBL } from "@/lib/format";
import type { PropertyDetail } from "@/types/api";

export interface DossierAiSummary {
  score: number;
  verdict: string;
  aiMaxBid: number;
  confidence: number;
  reasons: string[];
}

function esc(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxChars) {
      cur = (cur + " " + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

class PdfCanvas {
  private ops: string[] = [];

  rect(x: number, y: number, w: number, h: number, fillRgb?: [number, number, number], strokeRgb?: [number, number, number]) {
    if (fillRgb) {
      this.ops.push(`${fillRgb[0].toFixed(3)} ${fillRgb[1].toFixed(3)} ${fillRgb[2].toFixed(3)} rg`);
    }
    if (strokeRgb) {
      this.ops.push(`${strokeRgb[0].toFixed(3)} ${strokeRgb[1].toFixed(3)} ${strokeRgb[2].toFixed(3)} RG`);
      this.ops.push("0.7 w");
    }
    this.ops.push(`${x} ${y} ${w} ${h} re`);
    if (fillRgb && strokeRgb) this.ops.push("B");
    else if (fillRgb) this.ops.push("f");
    else if (strokeRgb) this.ops.push("S");
  }

  line(x1: number, y1: number, x2: number, y2: number, rgb: [number, number, number] = [0.85, 0.87, 0.9], width = 0.7) {
    this.ops.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} RG`);
    this.ops.push(`${width} w`);
    this.ops.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  text(
    str: string,
    x: number,
    y: number,
    size = 9.5,
    bold = false,
    rgb: [number, number, number] = [0.1, 0.12, 0.16]
  ) {
    this.ops.push("BT");
    this.ops.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg`);
    this.ops.push(`${bold ? "/F2" : "/F1"} ${size} Tf`);
    this.ops.push(`1 0 0 1 ${x} ${y} Tm`);
    this.ops.push(`(${esc(str)}) Tj`);
    this.ops.push("ET");
  }

  sectionHeader(title: string, y: number): number {
    this.rect(40, y - 4, 532, 18, [0.94, 0.96, 0.98]);
    this.rect(40, y - 4, 3.5, 18, [0.11, 0.42, 0.45]);
    this.text(title, 50, y + 1.5, 9.5, true, [0.11, 0.16, 0.29]);
    return y - 18;
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

export function buildPropertyDossierPdf(
  p: PropertyDetail,
  ai?: DossierAiSummary | null
): { filename: string; base64: string; blob: Blob } {
  const c = new PdfCanvas();
  const effectiveFlag = (p.flag ?? p.legal.documentary_flag ?? "HIGH").toLowerCase();
  const opening = p.financial.opening_price ?? 0;
  const deposit = p.legal.required_deposit ?? (opening > 0 ? Math.round(opening * 0.2) : null);

  // 1. CABECERA EJECUTIVA AZUL MARINO (#1B2A4A)
  c.rect(0, 712, 612, 80, [0.106, 0.165, 0.29]);
  c.rect(0, 709, 612, 3, [0.106, 0.42, 0.447]);
  c.text("CLEARBID NJ  |  AUCTION DUE DILIGENCE DOSSIER", 40, 766, 8.5, true, [0.55, 0.85, 0.87]);
  c.text(p.address, 40, 745, 15, true, [1, 1, 1]);
  c.text(
    `${p.city}, NJ ${p.zip}   •   Mercer County   •   Case: ${p.legal.case_number ?? "Pending Clerk Index"}`,
    40,
    727,
    9,
    false,
    [0.82, 0.86, 0.92]
  );

  // Badge de Riesgo en esquina superior derecha
  const badgeBg: [number, number, number] =
    effectiveFlag === "green"
      ? [0.09, 0.52, 0.25]
      : effectiveFlag === "yellow"
        ? [0.76, 0.47, 0.04]
        : [0.72, 0.11, 0.11];
  const badgeLabel =
    effectiveFlag === "green"
      ? "RISK: LOW / CLEAR"
      : effectiveFlag === "yellow"
        ? "RISK: MODERATE"
        : "RISK: HIGH / ALERT";
  c.rect(448, 742, 124, 22, badgeBg);
  c.text(badgeLabel, 458, 749.5, 8.5, true, [1, 1, 1]);
  c.text(`Issued: ${new Date().toLocaleDateString("en-US")}`, 468, 727, 8, false, [0.82, 0.86, 0.92]);

  let y = 684;

  // 2. SECCIÓN FINANCIERA (6 TARJETAS EN CUADRÍCULA 3x2)
  y = c.sectionHeader("1. FINANCIAL & VALUATION SPREAD LEDGER", y);

  const metrics = [
    { label: "OPENING BID", val: money(p.financial.opening_price), accent: [0.11, 0.16, 0.29] as [number, number, number] },
    { label: "AFTER-REPAIR VALUE (ARV)", val: money(p.financial.arv), accent: [0.11, 0.16, 0.29] as [number, number, number] },
    { label: "ESTIMATED NET ROI", val: roiText(p.financial.estimated_roi), accent: [0.09, 0.52, 0.25] as [number, number, number] },
    { label: "ESTIMATED REPAIRS", val: money(p.financial.estimated_repairs), accent: [0.25, 0.29, 0.35] as [number, number, number] },
    {
      label: p.financial.total_liens_verified ? "VERIFIED LIENS" : "REPORTED LIENS (UNVERIFIED)",
      val: money(p.financial.total_liens),
      accent: [0.76, 0.47, 0.04] as [number, number, number],
    },
    {
      label: "POTENTIAL NET PROFIT",
      val: money(p.financial.potential_profit),
      accent: ((p.financial.potential_profit ?? 0) < 0 ? [0.72, 0.11, 0.11] : [0.09, 0.52, 0.25]) as [number, number, number],
    },
  ];

  const cardW = 171;
  const cardH = 38;
  for (let i = 0; i < metrics.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 40 + col * (cardW + 9.5);
    const cy = y - row * (cardH + 8) - 24;
    c.rect(cx, cy, cardW, cardH, [0.985, 0.99, 0.995], [0.84, 0.87, 0.91]);
    c.text(metrics[i].label, cx + 9, cy + 25, 7, true, [0.42, 0.46, 0.53]);
    c.text(metrics[i].val, cx + 9, cy + 9, 12, true, metrics[i].accent);
  }
  y -= 98;

  // 3. SECCIÓN IA (TARJETA DESTACADA)
  if (ai) {
    y = c.sectionHeader("2. CLEARBID AI VIABILITY & BIDDING GUIDANCE", y);
    const reasonLines: string[] = [];
    for (const r of ai.reasons.slice(0, 3)) {
      reasonLines.push(...wrap(`• ${r}`, 92));
    }
    const boxH = 36 + reasonLines.length * 11.5;
    c.rect(40, y - boxH + 12, 532, boxH, [0.965, 0.978, 0.985], [0.78, 0.84, 0.88]);

    const vColor: [number, number, number] =
      ai.verdict.includes("STRONG")
        ? [0.09, 0.52, 0.25]
        : ai.verdict.includes("AVOID")
          ? [0.72, 0.11, 0.11]
          : [0.76, 0.47, 0.04];

    c.text(`VERDICT: ${ai.verdict}`, 50, y - 3, 9.5, true, vColor);
    c.text(
      `Viability Score: ${ai.score}/100 (${ai.confidence}% confidence)   |   AI Optimal Max Bid: ${money(ai.aiMaxBid)}   |   Suggested Max Bid: ${money(p.financial.suggested_max_bid)}`,
      50,
      y - 16,
      8.5,
      true,
      [0.15, 0.2, 0.28]
    );
    let ry = y - 30;
    for (const rl of reasonLines) {
      c.text(rl, 52, ry, 8.5, false, [0.24, 0.28, 0.34]);
      ry -= 11.5;
    }
    y -= boxH + 10;
  }

  // 4. PERFIL LEGAL Y SUBASTA (TABLA DE 2 COLUMNAS)
  y = c.sectionHeader(`${ai ? "3" : "2"}. LEGAL, TITLE & SHERIFF DOCKET`, y);
  const legalRows: [string, string, string, string][] = [
    [
      "Auction Type:",
      p.legal.auction_type ? AUC_LBL[p.legal.auction_type] ?? p.legal.auction_type : "Sheriff sale",
      "Scheduled Date:",
      p.legal.auction_date ? fdate(p.legal.auction_date) : "Pending Schedule",
    ],
    [
      "Title Status:",
      p.legal.title_status ?? "Preliminary Review",
      "Occupancy:",
      p.legal.occupancy ?? "Unknown (AS-IS)",
    ],
    [
      "Statutory Deposit (20%):",
      money(deposit),
      "Ownership Type:",
      p.legal.ownership_type ?? "Fee Simple",
    ],
    [
      "Surviving IRS Lien:",
      p.legal.surviving_irs_lien != null ? money(p.legal.surviving_irs_lien) : "$0 (Verify)",
      "Senior Liens:",
      p.legal.senior_liens != null ? money(p.legal.senior_liens) : "$0 (Verify)",
    ],
    [
      "Bankruptcy Flag:",
      p.legal.bankruptcy_indicator ? "Yes" : "No",
      "Open Permits:",
      String(p.legal.open_permits_count ?? 0),
    ],
  ];

  for (const [k1, v1, k2, v2] of legalRows) {
    c.text(k1, 46, y, 8.5, true, [0.35, 0.4, 0.47]);
    c.text(v1, 162, y, 8.5, false, [0.1, 0.12, 0.16]);
    c.text(k2, 315, y, 8.5, true, [0.35, 0.4, 0.47]);
    c.text(v2, 425, y, 8.5, false, [0.1, 0.12, 0.16]);
    c.line(40, y - 4, 572, y - 4, [0.91, 0.93, 0.95], 0.5);
    y -= 15;
  }
  y -= 6;

  // 5. PERFIL FÍSICO Y VECINDARIO
  y = c.sectionHeader(`${ai ? "4" : "3"}. PHYSICAL & NEIGHBORHOOD PROFILE`, y);
  const physRows: [string, string, string, string][] = [
    [
      "Property Type:",
      p.property_type ? TYPE_LBL[p.property_type] ?? p.property_type : "Single family",
      "Condition:",
      p.physical.condition ?? "AS-IS (Drive-by)",
    ],
    [
      "Living Area / Lot:",
      `${p.physical.sqft ? `${p.physical.sqft} sqft` : "N/A"} / ${p.physical.lot_sqft ? `${p.physical.lot_sqft} sqft` : "N/A"}`,
      "Beds / Baths:",
      `${p.physical.beds ?? "-"} bd / ${p.physical.baths ?? "-"} ba`,
    ],
    [
      "Year Built:",
      p.physical.year_built ? String(p.physical.year_built) : "N/A",
      "Neighborhood / School:",
      `${p.physical.neighborhood ?? p.city} (${p.physical.school_rating ? `${p.physical.school_rating}/10` : "N/R"})`,
    ],
  ];

  for (const [k1, v1, k2, v2] of physRows) {
    c.text(k1, 46, y, 8.5, true, [0.35, 0.4, 0.47]);
    c.text(v1, 162, y, 8.5, false, [0.1, 0.12, 0.16]);
    c.text(k2, 315, y, 8.5, true, [0.35, 0.4, 0.47]);
    c.text(v2, 425, y, 8.5, false, [0.1, 0.12, 0.16]);
    c.line(40, y - 4, 572, y - 4, [0.91, 0.93, 0.95], 0.5);
    y -= 15;
  }
  y -= 6;

  // 6. HALLAZGOS DOCUMENTALES / REGLAS
  if (p.legal.documentary_summary && y > 120) {
    y = c.sectionHeader(`${ai ? "5" : "4"}. PUBLIC RECORD DOCUMENTARY FINDINGS`, y);
    for (const line of wrap(p.legal.documentary_summary, 96).slice(0, 4)) {
      c.text(line, 46, y, 8.5, false, [0.2, 0.24, 0.3]);
      y -= 12;
    }
  }

  // PIE DE PÁGINA REGULATORIO (CAJA INFERIOR FIJA)
  c.rect(40, 28, 532, 44, [0.96, 0.965, 0.975], [0.85, 0.87, 0.9]);
  c.text(
    "CLEARBID NJ REGULATORY DISCLOSURE & LIMITATION OF LIABILITY:",
    48,
    59,
    7.5,
    true,
    [0.11, 0.16, 0.29]
  );
  c.text(
    "ClearBid NJ is an information service and is NOT a law firm, title insurer, lender, brokerage, or investment advisor.",
    48,
    48,
    7.2,
    false,
    [0.35, 0.39, 0.45]
  );
  c.text(
    "NJ Sheriff sales are strictly AS-IS with no interior inspection. Retain licensed NJ counsel and title insurance before bidding.",
    48,
    38,
    7.2,
    false,
    [0.35, 0.39, 0.45]
  );

  const stream = c.toStream();
  const objects: string[] = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const slug = p.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const filename = `ClearBid-Dossier-${slug || "property"}.pdf`;
  const base64 = btoa(pdf);
  const blob = new Blob([pdf], { type: "application/pdf" });

  return { filename, base64, blob };
}

export function downloadPropertyDossierPdf(
  p: PropertyDetail,
  ai?: DossierAiSummary | null
): { filename: string; base64: string } {
  const { filename, base64, blob } = buildPropertyDossierPdf(p, ai);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { filename, base64 };
}