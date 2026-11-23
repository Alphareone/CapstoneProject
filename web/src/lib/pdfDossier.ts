import { AUC_LBL, fdate, money, roiText, TYPE_LBL } from "@/lib/format";
import type { PropertyDetail } from "@/types/api";

function sanitizePdfText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function downloadPropertyDossierPdf(p: PropertyDetail): void {
  const lines: { text: string; size: number; bold?: boolean; gap?: number }[] = [
    { text: "CLEARBID NJ - PRE-AUCTION PROPERTY DOSSIER", size: 15, bold: true, gap: 22 },
    { text: `${p.address}, ${p.city}, NJ ${p.zip}`, size: 12, bold: true, gap: 16 },
    {
      text: `Risk Classification: ${(p.flag ?? p.legal.documentary_flag ?? "HIGH").toUpperCase()} | Generated: ${new Date().toLocaleDateString("en-US")}`,
      size: 10,
      gap: 20,
    },
    { text: "1. FINANCIAL ANALYSIS", size: 12, bold: true, gap: 16 },
    { text: `Opening Bid: ${money(p.financial.opening_price)}`, size: 10, gap: 14 },
    { text: `After Repair Value (ARV): ${money(p.financial.arv)}`, size: 10, gap: 14 },
    { text: `Estimated Rehab Anchor: ${money(p.financial.estimated_repairs)}`, size: 10, gap: 14 },
    { text: `Total Liens: ${money(p.financial.total_liens)}`, size: 10, gap: 14 },
    { text: `Suggested Max Bid: ${money(p.financial.suggested_max_bid)}`, size: 10, bold: true, gap: 14 },
    { text: `Potential Net Profit: ${money(p.financial.potential_profit)}`, size: 10, gap: 14 },
    { text: `Estimated ROI: ${roiText(p.financial.estimated_roi)}`, size: 10, bold: true, gap: 20 },

    { text: "2. LEGAL & AUCTION DOCKET", size: 12, bold: true, gap: 16 },
    { text: `Auction Type: ${p.legal.auction_type ? AUC_LBL[p.legal.auction_type] ?? p.legal.auction_type : "Sheriff sale"}`, size: 10, gap: 14 },
    { text: `Scheduled Sale Date: ${fdate(p.legal.auction_date)}`, size: 10, gap: 14 },
    { text: `Venue: ${p.legal.location ?? "Mercer County Civil Courthouse, Trenton, NJ"}`, size: 10, gap: 14 },
    { text: `Case / Docket Number: ${p.legal.case_number ?? "Pending Sheriff Docket"}`, size: 10, gap: 14 },
    { text: `Title Status: ${p.legal.title_status ?? "Preliminary Review"}`, size: 10, gap: 14 },
    { text: `Occupancy: ${p.legal.occupancy ?? "Unknown (No interior access)"}`, size: 10, gap: 14 },
    { text: `Required Deposit (20%): ${money(p.legal.required_deposit)}`, size: 10, gap: 14 },
    { text: `Surviving IRS Liens: ${money(p.legal.surviving_irs_lien)} | Senior Liens: ${money(p.legal.senior_liens)}`, size: 10, gap: 20 },

    { text: "3. PHYSICAL & NEIGHBORHOOD PROFILE", size: 12, bold: true, gap: 16 },
    { text: `Property Type: ${p.property_type ? TYPE_LBL[p.property_type] ?? p.property_type : "Single family"}`, size: 10, gap: 14 },
    { text: `Living Area: ${p.physical.sqft ? `${p.physical.sqft} sqft` : "N/A"} | Lot: ${p.physical.lot_sqft ? `${p.physical.lot_sqft} sqft` : "N/A"}`, size: 10, gap: 14 },
    { text: `Beds / Baths: ${p.physical.beds ?? "-"} bd / ${p.physical.baths ?? "-"} ba | Year Built: ${p.physical.year_built ?? "-"}`, size: 10, gap: 14 },
    { text: `Condition: ${p.physical.condition ?? "AS-IS (Exterior inspection only)"}`, size: 10, gap: 14 },
    { text: `Neighborhood: ${p.physical.neighborhood ?? p.city} | School Rating: ${p.physical.school_rating ? `${p.physical.school_rating}/10` : "N/A"}`, size: 10, gap: 22 },

    { text: "4. MANDATORY DISCLOSURE (CLEARBID NJ)", size: 11, bold: true, gap: 15 },
    { text: "ClearBid NJ is an information service, not a law firm, title insurer, or investment advisor.", size: 9, gap: 13 },
    { text: "Sheriff sales are strictly AS-IS with no interior inspection. Verify all liens with NJ counsel.", size: 9, gap: 13 },
  ];

  // Construcción de stream PDF 1.4 válido
  let y = 745;
  const ops: string[] = ["BT"];
  for (const line of lines) {
    const font = line.bold ? "/F2" : "/F1";
    ops.push(`${font} ${line.size} Tf`);
    ops.push(`1 0 0 1 50 ${y} Tm`);
    ops.push(`(${sanitizePdfText(line.text)}) Tj`);
    y -= line.gap ?? 15;
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

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = p.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  a.href = url;
  a.download = `ClearBid-Dossier-${slug || "property"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}