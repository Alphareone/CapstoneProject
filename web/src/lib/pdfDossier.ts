import { AUC_LBL, fdate, money, roiText, TYPE_LBL } from "@/lib/format";
import type { PropertyDetail } from "@/types/api";

export interface DossierAiSummary {
  score: number;
  verdict: string;
  aiMaxBid: number;
  confidence: number;
  reasons: string[];
}

function sanitizePdfText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars = 88): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length <= maxChars) {
      line = (line + " " + w).trim();
    } else {
      if (line) out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

export function buildPropertyDossierPdf(
  p: PropertyDetail,
  ai?: DossierAiSummary | null
): { filename: string; base64: string; blob: Blob } {
  const effectiveFlag = (p.flag ?? p.legal.documentary_flag ?? "HIGH").toUpperCase();
  const opening = p.financial.opening_price ?? 0;
  const deposit = p.legal.required_deposit ?? (opening > 0 ? Math.round(opening * 0.2) : null);

  const lines: { text: string; size: number; bold?: boolean; gap?: number }[] = [
    { text: "CLEARBID NJ - PRE-AUCTION PROPERTY DUE DILIGENCE DOSSIER", size: 14, bold: true, gap: 20 },
    { text: `${p.address}, ${p.city}, NJ ${p.zip}`, size: 11, bold: true, gap: 15 },
    {
      text: `Risk Classification: ${effectiveFlag}  |  County: Mercer, NJ  |  Generated: ${new Date().toLocaleDateString("en-US")}`,
      size: 9.5,
      gap: 18,
    },

    { text: "1. FINANCIAL & SPREAD LEDGER", size: 11, bold: true, gap: 14 },
    {
      text: `Opening Bid: ${money(p.financial.opening_price)}   |   After-Repair Value (ARV): ${money(p.financial.arv)}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Estimated Rehab Anchor: ${money(p.financial.estimated_repairs)}   |   Reported Liens: ${money(p.financial.total_liens)} (${p.financial.total_liens_verified ? "Verified" : "Unverified"})`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Suggested Max Bid: ${money(p.financial.suggested_max_bid)}   |   Potential Net Profit: ${money(p.financial.potential_profit)}   |   Est. ROI: ${roiText(p.financial.estimated_roi)}`,
      size: 9.5,
      bold: true,
      gap: 17,
    },
  ];

  if (ai) {
    lines.push(
      { text: "2. CLEARBID AI VIABILITY ASSESSMENT", size: 11, bold: true, gap: 14 },
      {
        text: `Verdict: ${ai.verdict}  |  Viability Score: ${ai.score}/100 (${ai.confidence}% confidence)  |  AI Optimal Max Bid: ${money(ai.aiMaxBid)}`,
        size: 9.5,
        bold: true,
        gap: 13,
      }
    );
    for (const r of ai.reasons.slice(0, 3)) {
      for (const wrapped of wrapText(`- ${r}`, 92)) {
        lines.push({ text: wrapped, size: 9, gap: 12 });
      }
    }
    lines.push({ text: "", size: 6, gap: 6 });
  }

  lines.push(
    { text: `${ai ? "3" : "2"}. LEGAL, TITLE & AUCTION DOCKET`, size: 11, bold: true, gap: 14 },
    {
      text: `Auction Type: ${p.legal.auction_type ? AUC_LBL[p.legal.auction_type] ?? p.legal.auction_type : "Sheriff sale"}   |   Scheduled Date: ${p.legal.auction_date ? fdate(p.legal.auction_date) : "Pending Sheriff Schedule"}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Venue: ${p.legal.location ?? "Mercer County Civil Courthouse, 175 S Broad St, Trenton, NJ"}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Docket / Case #: ${p.legal.case_number ?? "Pending Clerk Index"}   |   Title Status: ${p.legal.title_status ?? "Preliminary Public Record Review"}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Occupancy: ${p.legal.occupancy ?? "Unknown (AS-IS / No interior access)"}   |   Statutory Deposit (20%): ${money(deposit)}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Surviving IRS Liens: ${p.legal.surviving_irs_lien != null ? money(p.legal.surviving_irs_lien) : "$0 (Verify prior to bid)"}   |   Senior Liens: ${p.legal.senior_liens != null ? money(p.legal.senior_liens) : "$0 (Verify prior to bid)"}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Bankruptcy Flag: ${p.legal.bankruptcy_indicator ? "Yes" : "No"}   |   Open Permits: ${p.legal.open_permits_count ?? 0}   |   Ownership: ${p.legal.ownership_type ?? "Fee Simple"}`,
      size: 9.5,
      gap: 17,
    },

    { text: `${ai ? "4" : "3"}. PHYSICAL & NEIGHBORHOOD PROFILE`, size: 11, bold: true, gap: 14 },
    {
      text: `Property Type: ${p.property_type ? TYPE_LBL[p.property_type] ?? p.property_type : "Single family"}   |   Condition: ${p.physical.condition ?? "AS-IS (Exterior drive-by only)"}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Living Area: ${p.physical.sqft ? `${p.physical.sqft} sqft` : "N/A"}   |   Lot Size: ${p.physical.lot_sqft ? `${p.physical.lot_sqft} sqft` : "N/A"}   |   Beds/Baths: ${p.physical.beds ?? "-"} bd / ${p.physical.baths ?? "-"} ba   |   Built: ${p.physical.year_built ?? "-"}`,
      size: 9.5,
      gap: 13,
    },
    {
      text: `Neighborhood: ${p.physical.neighborhood ?? p.city}   |   School District Rating: ${p.physical.school_rating ? `${p.physical.school_rating}/10` : "Not rated"}`,
      size: 9.5,
      gap: 17,
    }
  );

  if (p.legal.documentary_summary) {
    lines.push({
      text: `${ai ? "5" : "4"}. DOCUMENTARY PUBLIC RECORD FINDINGS`,
      size: 11,
      bold: true,
      gap: 14,
    });
    for (const wrapped of wrapText(p.legal.documentary_summary, 92)) {
      lines.push({ text: wrapped, size: 9, gap: 12 });
    }
    lines.push({ text: "", size: 6, gap: 6 });
  }

  lines.push(
    { text: "MANDATORY REGULATORY DISCLOSURE (CLEARBID NJ)", size: 10, bold: true, gap: 13 },
    {
      text: "ClearBid NJ is an information service and is NOT a law firm, title insurer, lender, or investment advisor.",
      size: 8.5,
      gap: 11,
    },
    {
      text: "NJ Sheriff sales are strictly AS-IS with no interior inspection. Always retain licensed NJ counsel and title insurance.",
      size: 8.5,
      gap: 11,
    }
  );

  let y = 755;
  const ops: string[] = ["BT"];
  for (const line of lines) {
    if (y < 42) break;
    if (line.text) {
      const font = line.bold ? "/F2" : "/F1";
      ops.push(`${font} ${line.size} Tf`);
      ops.push(`1 0 0 1 46 ${y} Tm`);
      ops.push(`(${sanitizePdfText(line.text)}) Tj`);
    }
    y -= line.gap ?? 14;
  }
  ops.push("ET");
  const stream = ops.join("\n");

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