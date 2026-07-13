// cite_affected — bonus tool that calls a legacy SOAP web service to find the
// bills in a given biennium that amend/affect an RCW cite.
//
// Service: https://wslwebservices.leg.wa.gov/rcwciteaffectedservice.asmx
// Operation: GetLegislationAffectingRcwCite (params: biennium, rcwCite)
// SOAPAction: "http://WSLWebServices.leg.wa.gov/GetLegislationAffectingRcwCite"
// Response: soap:Envelope > Body > ...Response > ...Result > LegislationInfo[]
//
// This exists to demonstrate calling SOAP + parsing XML from an MCP tool.

import { XMLParser } from "fast-xml-parser";
import { postSoap } from "../http.js";

const ENDPOINT =
  "https://wslwebservices.leg.wa.gov/rcwciteaffectedservice.asmx";
const NS = "http://WSLWebServices.leg.wa.gov/";
const ACTION = `${NS}GetLegislationAffectingRcwCite`;
const BIENNIUM = /^\d{4}-\d{2}$/;

export interface AffectingBill {
  biennium: string;
  billId: string;
  billNumber?: number;
  type?: string;
  agency?: string;
  active?: boolean;
}

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });

/** Current WA biennium, e.g. 2026 -> "2025-26". Bienniums start in odd years. */
export function currentBiennium(now: Date = new Date()): string {
  const y = now.getFullYear();
  const start = y % 2 === 1 ? y : y - 1;
  const end = (start + 1) % 100;
  return `${start}-${String(end).padStart(2, "0")}`;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function envelope(biennium: string, rcwCite: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetLegislationAffectingRcwCite xmlns="${NS}">
      <biennium>${xmlEscape(biennium)}</biennium>
      <rcwCite>${xmlEscape(rcwCite)}</rcwCite>
    </GetLegislationAffectingRcwCite>
  </soap:Body>
</soap:Envelope>`;
}

function toBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export async function citeAffected(
  rcwCite: string,
  biennium?: string,
): Promise<{ biennium: string; rcwCite: string; bills: AffectingBill[] }> {
  const cite = rcwCite.trim();
  const bien = (biennium ?? currentBiennium()).trim();
  if (!BIENNIUM.test(bien)) {
    throw new Error(`Biennium must look like "2025-26"; got "${bien}".`);
  }

  const xml = await postSoap(ENDPOINT, ACTION, envelope(bien, cite));
  const doc = parser.parse(xml) as Record<string, any>;

  const result =
    doc?.Envelope?.Body?.GetLegislationAffectingRcwCiteResponse
      ?.GetLegislationAffectingRcwCiteResult;
  const infoRaw = result?.LegislationInfo;
  if (infoRaw == null) return { biennium: bien, rcwCite: cite, bills: [] };

  const list = Array.isArray(infoRaw) ? infoRaw : [infoRaw];
  const bills: AffectingBill[] = list.map((i) => ({
    biennium: String(i?.Biennium ?? bien),
    billId: String(i?.BillId ?? ""),
    billNumber: i?.BillNumber != null ? Number(i.BillNumber) : undefined,
    type: i?.ShortLegislationType?.LongLegislationType
      ? String(i.ShortLegislationType.LongLegislationType)
      : undefined,
    agency: i?.OriginalAgency != null ? String(i.OriginalAgency) : undefined,
    active: toBool(i?.Active),
  }));

  return { biennium: bien, rcwCite: cite, bills };
}
