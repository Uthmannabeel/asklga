/**
 * The functions of a local government council, as the Fourth Schedule to the 1999 Constitution
 * sets them out. Residents report problems and score their council against these nine, so a
 * report about a secondary school or a federal road is routed to the right tier instead of
 * counting against the council.
 *
 * Paragraph 1 lists the council's own functions; paragraph 2 the ones it shares with the State.
 */
export type FnKey = "roads" | "waste" | "markets" | "health" | "education" | "water" | "registry" | "revenue" | "agriculture";

export type CouncilFunction = {
  key: FnKey;
  label: string;
  short: string;
  /** Paragraph of the Fourth Schedule. */
  ref: string;
  shared: boolean;
  examples: string[];
  /** What residents often raise under this heading that another tier of government owns. */
  notCouncil?: string;
};

export const FUNCTIONS: CouncilFunction[] = [
  {
    key: "roads",
    label: "Roads, streets, lighting and drains",
    short: "Roads and drains",
    ref: "4th Sch. 1(f), 1(g)",
    shared: false,
    examples: ["Potholes on a council road", "Blocked or collapsed drain", "Street light not working", "Road naming and house numbering"],
    notCouncil: "Federal and State roads (trunk roads, expressways, state highways) belong to the Federal Ministry of Works or the State Ministry of Works.",
  },
  {
    key: "waste",
    label: "Refuse, sanitation and the environment",
    short: "Refuse and sanitation",
    ref: "4th Sch. 1(h), 1(k)",
    shared: false,
    examples: ["Refuse not collected", "Illegal dump site", "Public toilet out of use", "Outdoor advertising and noise"],
    notCouncil: "Where a State waste agency collects refuse (for example LAWMA in Lagos or RIWAMA in Rivers), the report goes to that agency and the council is asked to follow up.",
  },
  {
    key: "markets",
    label: "Markets, motor parks and public conveniences",
    short: "Markets and parks",
    ref: "4th Sch. 1(e)",
    shared: false,
    examples: ["Market stalls and sanitation", "Motor park management and fees", "Public conveniences", "Slaughterhouses and abattoirs"],
  },
  {
    key: "health",
    label: "Primary health care",
    short: "Health centres",
    ref: "4th Sch. 2(c), with the State",
    shared: true,
    examples: ["Primary health centre closed or unstaffed", "No drugs or vaccines", "Immunisation outreach", "Maternity services at the PHC"],
    notCouncil: "General and teaching hospitals are State or Federal.",
  },
  {
    key: "education",
    label: "Primary, adult and vocational education",
    short: "Primary schools",
    ref: "4th Sch. 2(a), with the State",
    shared: true,
    examples: ["Primary school classroom unsafe", "No teachers or furniture", "Adult literacy classes", "Vocational centre"],
    notCouncil: "Secondary schools are State; universities and polytechnics are State or Federal.",
  },
  {
    key: "water",
    label: "Water points and rural utilities",
    short: "Water",
    ref: "State law and the health function, 4th Sch. 2(c), 2(d)",
    shared: true,
    examples: ["Borehole not working", "Public standpipe", "Rural water scheme", "Hand pump repair"],
    notCouncil: "Piped town water is usually a State water board; electricity supply is the distribution company (DisCo), not the council.",
  },
  {
    key: "registry",
    label: "Births, deaths and marriages",
    short: "Registry",
    ref: "4th Sch. 1(i), 1(c)",
    shared: false,
    examples: ["Birth certificate delay", "Death registration", "Registry marriage", "Cemeteries and burial grounds"],
    notCouncil: "National identity numbers (NIN) and passports are Federal (NIMC and the Immigration Service).",
  },
  {
    key: "revenue",
    label: "Rates, licences and permits",
    short: "Rates and permits",
    ref: "4th Sch. 1(b), 1(d), 1(j), 1(k)",
    shared: false,
    examples: ["Tenement rate assessment", "Shop, kiosk and food premises licence", "Bicycle, cart and canoe licence", "Illegal levy or tout at a park"],
    notCouncil: "PAYE, land use charge and most business taxes are State; company tax and VAT are Federal.",
  },
  {
    key: "agriculture",
    label: "Agriculture and natural resources",
    short: "Agriculture",
    ref: "4th Sch. 2(b), with the State",
    shared: true,
    examples: ["Extension officer visits", "Farm input distribution", "Grazing and farm disputes", "Fisheries and livestock"],
    notCouncil: "Mineral resources and oil are Federal.",
  },
];

export const FN_KEYS = FUNCTIONS.map((f) => f.key) as FnKey[];

export function isFnKey(x: unknown): x is FnKey {
  return typeof x === "string" && (FN_KEYS as string[]).includes(x);
}

export function fnLabel(key: string, short = false): string {
  const f = FUNCTIONS.find((x) => x.key === key);
  return f ? (short ? f.short : f.label) : key;
}
