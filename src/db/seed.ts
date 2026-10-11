import { and, eq, inArray, like, sql } from "drizzle-orm";
import * as s from "./schema";

/**
 * Obio/Akpor pilot records, compiled on 9 Oct 2026 from published sources: the council's own
 * website (obioakpor.riversstateapps.ng), dated news reports and state government announcements.
 * Every record names its source. None has yet been confirmed by the council's data owner, so the
 * LGA row carries compiled = true and every page shows a banner saying so.
 *
 * Map pins are approximate (community centre or landmark), except UPTH (published coordinates).
 * Nothing here is invented: where a source gives no amount, contractor or date, the field is empty.
 */

const LGA = "obio-akpor";
// last_verified is the date the council confirmed a record, so it stays empty until it does;
// the stamp then reads "Not yet verified". Compiled from sources on 9 Oct 2026.
const NOT_CONFIRMED = "Not yet confirmed by the council.";
// Earlier builds seeded illustrative records with this source; they are replaced on start.
const OLD_DEMO_SOURCE = "Demo seed (illustrative)%";

const src = (s: string) => `Compiled from public sources: ${s}. ${NOT_CONFIRMED}`;

const COUNCIL_SITE = "https://obioakpor.riversstateapps.ng/";
const REVENUE_PAGE = "https://obioakpor.riversstateapps.ng/obio-akpor-lga-revenue-schedule/";
const MARRIAGE_PAGE = "https://obioakpor.riversstateapps.ng/marriage-registry-department/";
const SANITATION_PAGE = "https://obioakpor.riversstateapps.ng/sanitation/";
const COUNCILLORS_PAGE = "https://obioakpor.riversstateapps.ng/executives-and-councillors/";
const WORKS_INSPECTION = "https://obioakpor.riversstateapps.ng/works-committee-conducts-oversight-inspection/";
const OGBOGORO_PHC = "https://obioakpor.riversstateapps.ng/dr-gift-worlu-inspects-revitalization-works-at-ogbogoro-primary-health-care-centre/";
const WASTE_TO_ENERGY = "https://obioakpor.riversstateapps.ng/obio-akpor-council-un-partner-on-waste-to-energy-project/";
const SUPP_BUDGET = "https://elanhub.net/obio-akpor-lg-chairman-presents-%E2%82%A65-34bn-2025-supplementary-appropriation-bill/";
const BUDGET_2025 = "https://guardian.ng/news/obio-akpor-lg-boss-chijioke-ihunwo-signs-2025-appropriation-bill-to-law/";
const OKANIA_FLAGOFF = "https://nationalaccordnewspaper.com/governor-fubara-flags-off-n6-7bn-okania-ogbogoro-road-project/";
const OKANIA_STALLED = "https://radionigeriasouthsouth.gov.ng/governor-fubara-urge-to-complete-dualisation-of-okania-ogbogoro-road/";
const RUMUOKURUSI_ROAD = "https://thesun.ng/fubara-fixes-3-months-to-rehabilitate-11-yrs-abandoned-road/";
const COMMISSIONING_LIST = "https://allafrica.com/stories/202608170627.html";
const RUMUIGBO_HOSPITALS = "https://von.gov.ng/rivers-government-upgrades-hospitals-to-boost-healthcare-delivery/";
const FLYOVERS_AWARD = "https://gazettengr.com/wike-awards-ninth-flyover-to-julius-berger-total-cost-now-n73-billion/";
const FLYOVERS_THISDAY = "https://www.thisdaylive.com/2020/07/29/passion-for-development/";
const RING_ROAD = "https://en.wikipedia.org/wiki/Port_Harcourt_Ring_Road_Project";
const UPTH_WIKI = "https://en.wikipedia.org/wiki/University_of_Port_Harcourt_Teaching_Hospital";
const CEAPOLY_WIKI = "https://en.wikipedia.org/wiki/Captain_Elechi_Amadi_Polytechnic";

export function chunkText(body: string, target = 700): string[] {
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > target && cur) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const pad = (n: number) => String(n).padStart(4, "0");

type Rec<T> = Omit<T, "id" | "lgaId" | "approval" | "lastVerified">;

const P = (n: number, v: Rec<typeof s.projects.$inferInsert>): typeof s.projects.$inferInsert => ({
  id: `OBA-P-${pad(n)}`, lgaId: LGA, approval: "approved", lastVerified: null, ...v,
});
const A = (n: number, v: Rec<typeof s.assets.$inferInsert>): typeof s.assets.$inferInsert => ({
  id: `OBA-A-${pad(n)}`, lgaId: LGA, approval: "approved", lastVerified: null, ...v,
});
const S = (n: number, v: Rec<typeof s.services.$inferInsert>): typeof s.services.$inferInsert => ({
  id: `OBA-S-${pad(n)}`, lgaId: LGA, approval: "approved", lastVerified: null, ...v,
});

export const PROJECTS = [
  P(1, {
    name: "Okania–Ogbogoro road dualisation (5 km)",
    type: "road",
    ward: "Ogbogoro / Ozuoba",
    lat: 4.862, lng: 6.935,
    sponsor: "State",
    budgetYear: 2024,
    amountNgn: 6_700_000_000,
    contractor: "China Civil Engineering Construction Corporation (CCECC) Nigeria Ltd",
    startDate: "2024-05",
    expectedCompletion: "2024-10",
    status: "stalled",
    statusNote: "Flagged off by Governor Fubara on 25 May 2024 with a five-month timeline; a 40% advance of N2.69 billion was paid. Road is 5 km by 10 m with 2.5 km of drains. Radio Nigeria reported on 30 Sep 2025 that work stopped during the six-month emergency rule and residents were appealing for completion. No later progress report found.",
    evidence: [{ url: OKANIA_STALLED, caption: "Radio Nigeria: residents appeal for completion", date: "2025-09-30" }],
    source: src("National Accord, Governor Fubara flags off N6.7bn Okania-Ogbogoro road project (25 May 2024); Radio Nigeria (30 Sep 2025)"),
    sourceUrl: OKANIA_FLAGOFF,
  }),
  P(2, {
    name: "Rumuokurusi–Igbo-Etche road reconstruction (16.5 km)",
    type: "road",
    ward: "Rumuokurusi / Atali / Eneka",
    lat: 4.862, lng: 7.065,
    sponsor: "State",
    startDate: null,
    expectedCompletion: "2024-11",
    status: "unknown",
    statusNote: "On 19 Aug 2024 the governor inspected the reconstruction, said the road had been impassable for 11 years, and set three months for completion. Contractor and cost were not published in that report. No later status report found.",
    source: src("The Sun, Fubara fixes 3 months to rehabilitate 11 yrs abandoned road (19 Aug 2024)"),
    sourceUrl: RUMUOKURUSI_ROAD,
  }),
  P(3, {
    name: "New General Hospital, Rumuigbo",
    type: "health",
    ward: "Rumuigbo",
    lat: 4.852, lng: 6.987,
    sponsor: "State",
    status: "completed",
    statusNote: "Commissioned by the Rivers State Government in late August 2026 (scheduled for 27 Aug). Services: accident and emergency, consulting rooms, pharmacy, laboratory, X-ray, maternity, operating theatre, ICU, paediatric and adult wards. Built to serve Rumuigbo, Rumuola, Rumuolumeni and nearby communities. Cost and contractor not published.",
    evidence: [{ url: COMMISSIONING_LIST, caption: "Vanguard: commissioning schedule", date: "2026-08-16" }],
    source: src("Voice of Nigeria, Rivers government upgrades hospitals to boost healthcare delivery (28 Aug 2026)"),
    sourceUrl: RUMUIGBO_HOSPITALS,
  }),
  P(4, {
    name: "Neuro-Psychiatric Hospital rebuild and 100-bed rehabilitation centre, Rumuigbo",
    type: "health",
    ward: "Rumuigbo",
    lat: 4.853, lng: 6.985,
    sponsor: "State",
    status: "completed",
    statusNote: "The 1977 hospital (originally 50 beds) was rebuilt and commissioned in late August 2026, with a 100-bed rehabilitation centre for mental health and substance abuse, wards, laboratory, pharmacy and an ECT centre. Cost and contractor not published.",
    evidence: [{ url: COMMISSIONING_LIST, caption: "Vanguard: commissioning schedule", date: "2026-08-16" }],
    source: src("Voice of Nigeria, Rivers government upgrades hospitals to boost healthcare delivery (28 Aug 2026)"),
    sourceUrl: RUMUIGBO_HOSPITALS,
  }),
  P(5, {
    name: "Rumuokoro (Okoro-Nu-Odu) flyover, 360 m",
    type: "road",
    ward: "Rumuokoro",
    lat: 4.867, lng: 6.996,
    sponsor: "State",
    budgetYear: 2019,
    contractor: "Julius Berger Nigeria Plc",
    startDate: "2019-10",
    status: "completed",
    statusNote: "Awarded in October 2019 with the Rumuogba and Rebisi flyovers, about N21 billion for all three (no separate figure published). Reported as commissioned; the governor said in November 2020 it would be commissioned that December. Exact commissioning date not confirmed.",
    evidence: [{ url: FLYOVERS_THISDAY, caption: "ThisDay: flyover lengths and sites", date: "2020-07-29" }],
    source: src("Peoples Gazette, Wike awards ninth flyover to Julius Berger; ThisDay (29 Jul 2020)"),
    sourceUrl: FLYOVERS_AWARD,
  }),
  P(6, {
    name: "Rumuogba (Artillery Junction) flyovers 1 and 2, 517.5 m",
    type: "road",
    ward: "Rumuogba",
    lat: 4.833, lng: 7.018,
    sponsor: "State",
    budgetYear: 2019,
    contractor: "Julius Berger Nigeria Plc",
    startDate: "2019-10",
    status: "completed",
    statusNote: "Part of the October 2019 three-flyover award (about N21 billion in total). Reported as commissioned; exact date not confirmed.",
    evidence: [{ url: FLYOVERS_THISDAY, caption: "ThisDay: flyover lengths and sites", date: "2020-07-29" }],
    source: src("Peoples Gazette, Wike awards ninth flyover to Julius Berger; ThisDay (29 Jul 2020)"),
    sourceUrl: FLYOVERS_AWARD,
  }),
  P(7, {
    name: "Port Harcourt Ring Road (Obio/Akpor sections)",
    type: "road",
    ward: "Several",
    sponsor: "State",
    budgetYear: 2023,
    amountNgn: 195_300_000_000,
    contractor: "Julius Berger Nigeria Plc",
    startDate: "2023-07",
    expectedCompletion: "2026-07",
    status: "ongoing",
    statusNote: "About 50 km ring road through six LGAs including Obio/Akpor, flagged off on 17 Jul 2023 with a three-year schedule. The N195.3 billion figure is for the whole road. Listed as in progress; no dated progress report for the Obio/Akpor sections found.",
    source: src("Wikipedia, Port Harcourt Ring Road Project (citing Julius Berger and July 2023 press reports)"),
    sourceUrl: RING_ROAD,
  }),
  P(8, {
    name: "Ogbogoro Primary Health Care Centre revitalisation",
    type: "health",
    ward: "Ogbogoro",
    lat: 4.858, lng: 6.93,
    sponsor: "LGA",
    budgetYear: 2026,
    status: "ongoing",
    statusNote: "Co-funded by the council and the Rivers State Primary Health Care Management Board; the fourth facility in the programme. The chairman inspected the works in September 2026. Contractor, cost and completion date not published.",
    source: src("Obio/Akpor council website, Dr. Gift Worlu inspects revitalization works at Ogbogoro PHC (Sep 2026)"),
    sourceUrl: OGBOGORO_PHC,
  }),
  P(9, {
    name: "New office complex, council secretariat",
    type: "other",
    ward: "Rumuodomaya",
    lat: 4.869, lng: 7.003,
    sponsor: "LGA",
    status: "ongoing",
    statusNote: "Inspected by the Works Committee of the 10th Legislative Council in September 2026, with the Chairman's Lodge, a sick bay and other works at the secretariat. Contractor, cost and progress not published.",
    source: src("Obio/Akpor council website, Works Committee conducts oversight inspection (26 Sep 2026)"),
    sourceUrl: WORKS_INSPECTION,
  }),
  P(10, {
    name: "Chairman's Lodge, council secretariat",
    type: "other",
    ward: "Rumuodomaya",
    lat: 4.869, lng: 7.003,
    sponsor: "LGA",
    status: "ongoing",
    statusNote: "Inspected by the Works Committee in September 2026. Contractor, cost and progress not published.",
    source: src("Obio/Akpor council website, Works Committee conducts oversight inspection (26 Sep 2026)"),
    sourceUrl: WORKS_INSPECTION,
  }),
  P(11, {
    name: "Staff sick bay, council secretariat",
    type: "health",
    ward: "Rumuodomaya",
    lat: 4.869, lng: 7.003,
    sponsor: "LGA",
    status: "ongoing",
    statusNote: "Inspected by the Works Committee in September 2026. Contractor, cost and progress not published.",
    source: src("Obio/Akpor council website, Works Committee conducts oversight inspection (26 Sep 2026)"),
    sourceUrl: WORKS_INSPECTION,
  }),
  P(12, {
    name: "Waste-to-energy (biogas) pilot with the United Nations",
    type: "other",
    ward: null,
    sponsor: "Other",
    status: "planned",
    statusNote: "Announced and demonstrated at a public exhibition in September 2026: an anaerobic digester turning organic waste into cooking gas, electricity and fertiliser. The UN agency, site and cost were not named.",
    source: src("Obio/Akpor council website, Obio/Akpor council, UN partner on waste-to-energy project (Sep 2026)"),
    sourceUrl: WASTE_TO_ENERGY,
  }),
  P(13, {
    name: "Entrepreneurship Centre and Engineering Faculty building, Captain Elechi Amadi Polytechnic",
    type: "education",
    ward: "Rumuola",
    lat: 4.838, lng: 7.0,
    sponsor: "State",
    status: "completed",
    statusNote: "Listed for commissioning on 19 Aug 2026 in the state's August 2026 programme. Cost and contractor not published; ceremony report not yet found.",
    source: src("Vanguard via AllAfrica, Fubara to commission 10 major projects across Rivers (16 Aug 2026)"),
    sourceUrl: COMMISSIONING_LIST,
  }),
];

export const ASSETS = [
  A(1, { name: "Obio/Akpor LGA council secretariat", type: "other", ward: "Rumuodomaya", lat: 4.869, lng: 7.003, condition: "unknown", notes: "Administrative headquarters. Office hours Monday to Friday, 8am to 6pm. Phone 0916 268 4923. New office complex, Chairman's Lodge and sick bay under construction (see OBA-P-0009 to 0011).", source: src("Obio/Akpor council website (Oct 2026)"), sourceUrl: COUNCIL_SITE }),
  A(2, { name: "University of Port Harcourt Teaching Hospital (UPTH)", type: "health", ward: "Alakahia / Choba", lat: 4.8994, lng: 6.9286, condition: "unknown", notes: "Federal teaching hospital on the East-West Road. Established 1980; 782 beds listed. Not run by the council.", source: src("Wikipedia, University of Port Harcourt Teaching Hospital"), sourceUrl: UPTH_WIKI }),
  A(3, { name: "General Hospital, Rumuigbo", type: "health", ward: "Rumuigbo", lat: 4.852, lng: 6.987, condition: "good", lastInspected: "2026-08", notes: "State hospital commissioned August 2026: emergency, maternity, theatre, ICU, X-ray, laboratory, paediatric and adult wards. Not run by the council.", source: src("Voice of Nigeria (28 Aug 2026)"), sourceUrl: RUMUIGBO_HOSPITALS }),
  A(4, { name: "Neuro-Psychiatric Hospital, Rumuigbo", type: "health", ward: "Rumuigbo", lat: 4.853, lng: 6.985, condition: "good", lastInspected: "2026-08", notes: "State psychiatric hospital, rebuilt 2026, with a 100-bed rehabilitation centre for mental health and substance abuse. Not run by the council.", source: src("Voice of Nigeria (28 Aug 2026)"), sourceUrl: RUMUIGBO_HOSPITALS }),
  A(5, { name: "Ogbogoro Primary Health Care Centre", type: "health", ward: "Ogbogoro", lat: 4.858, lng: 6.93, condition: "unknown", notes: "Under revitalisation in 2026 (see OBA-P-0008).", source: src("Obio/Akpor council website (Sep 2026)"), sourceUrl: OGBOGORO_PHC }),
  A(6, { name: "Captain Elechi Amadi Polytechnic", type: "school", ward: "Rumuola", lat: 4.838, lng: 7.0, condition: "unknown", notes: "Rivers State polytechnic, established 1987. Not run by the council.", source: src("Wikipedia, Captain Elechi Amadi Polytechnic"), sourceUrl: CEAPOLY_WIKI }),
  A(7, { name: "Rumuokoro (Okoro-Nu-Odu) flyover", type: "road", ward: "Rumuokoro", lat: 4.867, lng: 6.996, condition: "unknown", notes: "State flyover, 360 m, built by Julius Berger (see OBA-P-0005).", source: src("ThisDay (29 Jul 2020)"), sourceUrl: FLYOVERS_THISDAY }),
  A(8, { name: "Rumuogba (Artillery Junction) flyovers", type: "road", ward: "Rumuogba", lat: 4.833, lng: 7.018, condition: "unknown", notes: "State flyovers 1 and 2, 517.5 m, built by Julius Berger (see OBA-P-0006).", source: src("ThisDay (29 Jul 2020)"), sourceUrl: FLYOVERS_THISDAY }),
];

export const SERVICES = [
  S(1, {
    name: "Local government identification (online application)",
    category: "Identity and records",
    summary: "The council website describes an online application for the local government identification letter, paid by card. The website links to imo.lgaid.ng, which appears to be another state's portal; confirm the correct link with the council before paying.",
    eligibility: "Not stated on the council website.",
    documents: ["Birth certificate or age declaration (PDF)", "Passport photograph on a white background (PNG or JPEG)"],
    steps: [
      "Sign up on the portal the council links to and confirm the code sent to your email",
      "Log in, choose New Application and pay through Paystack",
      "Fill in personal details and parents' details, upload the documents, and submit",
      "Download the letter later from Application menu, My Application",
    ],
    office: "Council secretariat, Rumuodomaya",
    contact: "0916 268 4923 (Mon to Fri, 8am to 6pm)",
    source: src("Obio/Akpor council website, application procedure (Oct 2026)"),
    sourceUrl: COUNCIL_SITE,
  }),
  S(2, {
    name: "Statutory marriage registration",
    category: "Identity and records",
    summary: "The Marriage Registry receives notices of marriage, checks documents (age, consent, marital status), schedules and conducts statutory marriages, issues certified true copies of marriage certificates, and searches and verifies marriage records.",
    eligibility: "Intending couples who meet the legal requirements for a statutory marriage.",
    documents: [],
    steps: [
      "Give notice of marriage at the Marriage Registry",
      "The registry verifies your documents",
      "The registry schedules and conducts the marriage and issues the certificate",
    ],
    office: "Marriage Registry, council secretariat, Rumuodomaya",
    role: "Marriage Registrar",
    contact: "0916 268 4923 (Mon to Fri, 8am to 6pm)",
    source: src("Obio/Akpor council website, Marriage Registry department (Oct 2026). The page lists no document checklist; ask the registry"),
    sourceUrl: MARRIAGE_PAGE,
  }),
  S(3, {
    name: "Pay council rates, levies and permits online (TAMIS)",
    category: "Business",
    summary: "Council revenue can be paid online through the council's TAMIS portal: tenement rates, shop, kiosk and lock-up fees, market fees and rents, business permits and licences, operational permits, health approval, sanitation charges, advertisement and billboard charges, liquor and event licences, motor park levies, and birth, death and marriage registration.",
    eligibility: "Property owners, traders, businesses and transport operators in the LGA, depending on the item.",
    documents: [],
    steps: ["Open tamis.obioakpor.riversstateapps.ng", "Choose the revenue item and pay"],
    office: "Revenue, council secretariat, Rumuodomaya",
    contact: "0916 268 4923 (Mon to Fri, 8am to 6pm)",
    source: src("Obio/Akpor council website, revenue schedule (Oct 2026). Amounts are set per item; ask the council or check TAMIS"),
    sourceUrl: REVENUE_PAGE,
  }),
  S(4, {
    name: "Student bursary application",
    category: "Education",
    summary: "The council website links to an online form for its student bursary (scholarship).",
    eligibility: "Not stated on the council website.",
    documents: [],
    steps: ["Open the Student Bursary link on the council website and complete the form"],
    office: "Education department",
    contact: "0916 268 4923 (Mon to Fri, 8am to 6pm)",
    source: src("Obio/Akpor council website (Oct 2026)"),
    sourceUrl: COUNCIL_SITE,
  }),
  S(5, {
    name: "Report land grabbing",
    category: "Environment",
    summary: "The council's committee on land grabbing takes petitions on WhatsApp.",
    eligibility: "Any resident or landowner.",
    documents: [],
    steps: ["Send the petition on WhatsApp to 0707 862 6967"],
    office: "Committee on land grabbing",
    contact: "WhatsApp 0707 862 6967",
    source: src("Obio/Akpor council website (Oct 2026)"),
    sourceUrl: COUNCIL_SITE,
  }),
  S(6, {
    name: "Environmental sanitation enquiries",
    category: "Environment",
    summary: "The Environmental Sanitation department enforces sanitation regulations and runs community participation. The council website gives no complaint procedure; contact the department.",
    eligibility: "Any resident.",
    documents: [],
    steps: ["Call the council line during office hours"],
    office: "Environmental Sanitation department, council secretariat",
    contact: "0916 268 4923 (Mon to Fri, 8am to 6pm)",
    source: src("Obio/Akpor council website, Environmental Sanitation department (Oct 2026)"),
    sourceUrl: SANITATION_PAGE,
  }),
];

const I = (ord: number, section: string, title: string, body: string, source: string, sourceUrl: string): typeof s.profileSections.$inferInsert => ({
  id: `OBA-I-${section}`, lgaId: LGA, section, title, body, ord, source: src(source), sourceUrl, approval: "approved", lastVerified: null,
});

export const PROFILE = [
  I(1, "location", "Location and people",
    "Obio/Akpor was created on 3 May 1989 from the former Port Harcourt LGA and is part of the Port Harcourt metropolitan area. It covers about 260 square kilometres. The headquarters is at Rumuodomaya. It is home to the Ikwerre people and a large population from across Nigeria. The 2006 census counted 462,350 people.",
    "Obio/Akpor council website; NBS Annual Abstract of Statistics 2011", COUNCIL_SITE),
  I(2, "other", "Council leadership",
    "Executive Chairman: Hon. Dr. Gift O. Worlu, in office since 1 September 2025. Leader of the 10th Legislative Council: Rt. Hon. Rex-Milia Abuchi Amadi. The council has 17 wards, each electing one councillor; the council website lists the councillors by ward number. Head of Local Government Administration in October 2025: Sunny Adibe.",
    "Obio/Akpor council website, Executives and Councillors; Elanhub (30 Oct 2025)", COUNCILLORS_PAGE),
  I(3, "contacts", "Contacts",
    "Council secretariat, Rumuodomaya. Phone 0916 268 4923, Monday to Friday 8am to 6pm. Website obioakpor.riversstateapps.ng. X (Twitter) @ObioAkporInfoC. Online payments: tamis.obioakpor.riversstateapps.ng. Land grabbing petitions: WhatsApp 0707 862 6967.",
    "Obio/Akpor council website (Oct 2026)", COUNCIL_SITE),
];

const D = (n: number, title: string, kind: string, body: string, source: string, sourceUrl: string, reviewBy: string): typeof s.documents.$inferInsert => ({
  id: `OBA-D-${pad(n)}`, lgaId: LGA, title, kind, visibility: "public", body, source: src(source), sourceUrl, approval: "approved", reviewBy,
});

export const DOCUMENTS = [
  D(1, "2025 supplementary budget (OBALGA A.R.I.S.E. budget), presented 30 Oct 2025", "budget",
    `On 30 October 2025 the Obio/Akpor chairman, Hon. Dr. Gift Worlu, presented a 2025 supplementary appropriation bill, named the OBALGA A.R.I.S.E. Budget, to the 10th Legislative Council. His administration took office on 1 September 2025 and said a review of the council's finances showed priorities had to be reordered to meet urgent community needs and finish ongoing projects.

Total projected revenue for the supplementary period: N5,347,744,106.67.

Recurrent expenditure: N3,022,500,000.00, made up of personnel costs of N1,882,500,000.00 and overheads of N1,140,000,000.00. Capital expenditure: N2,271,766,665.60. Reserve (1% of the total under fiscal rules): N53,477,441.07.

The report names no individual projects or sector amounts. Capital funds are for completing ongoing capital works, infrastructure renewal, environmental sanitation, market development and other community initiatives. The council leader, Rt. Hon. Rex-Milia Abuchi Amadi, pledged quick passage. A separate report gives the total as N5.43 billion; the detailed report's figures above add up to N5.35 billion.`,
    "Elanhub, Obio/Akpor LG chairman presents N5.34bn 2025 supplementary appropriation bill (30 Oct 2025)", SUPP_BUDGET, "2027-03-31"),
  D(2, "2025 budget signed into law, January 2025", "budget",
    `In January 2025 the then chairman of Obio/Akpor, Chijioke Ihunwo, signed the council's 2025 Appropriation Bill into law. The estimate was over N12.4 billion. It had been laid before the legislative council about two weeks earlier and was passed unanimously after review. The published report available to AskLGA did not break the budget down by capital and recurrent spending or by project.`,
    "The Guardian, Obio/Akpor LG boss Chijioke Ihunwo signs 2025 appropriation bill to law (Jan 2025)", BUDGET_2025, "2027-03-31"),
  D(3, "Works Committee oversight inspection, September 2026", "notice",
    `The House Committee on Works of the Obio/Akpor 10th Legislative Council inspected ongoing projects at the council secretariat, Rumuodomaya: the proposed new office complex, the proposed Chairman's Lodge, the proposed sick bay, and other infrastructure works in the secretariat. The committee assessed progress, quality of materials and compliance with specifications, and resolved to meet the site engineers and contractors about its observations. The report gives no contractor names, costs or percentages of completion.`,
    "Obio/Akpor council website, Works Committee conducts oversight inspection (26 Sep 2026)", WORKS_INSPECTION, "2027-03-31"),
  D(4, "State projects commissioned in Obio/Akpor, August 2026", "notice",
    `The Rivers State Government's August 2026 commissioning programme, announced by the Secretary to the State Government on 16 August 2026, included three projects in Obio/Akpor: the Entrepreneurship Centre and Engineering Faculty building at Captain Elechi Amadi Polytechnic, Rumuola (19 August), and the rebuilt Neuro-Psychiatric Hospital and the new General Hospital, both at Rumuigbo (27 August).

Voice of Nigeria reported on 28 August 2026 that both Rumuigbo hospitals had been commissioned. The psychiatric hospital, first opened in 1977 with 50 beds, now includes a 100-bed rehabilitation centre for mental health and substance abuse. The general hospital provides emergency care, maternity, an operating theatre, an ICU, X-ray, laboratory and wards, and was built because the area had only primary health centres. No costs or contractors were published.`,
    "Vanguard via AllAfrica (16 Aug 2026); Voice of Nigeria (28 Aug 2026)", RUMUIGBO_HOSPITALS, "2027-08-31"),
];

/**
 * Seeds the Obio/Akpor pilot records. Replaces the illustrative records earlier builds seeded
 * (identified by their source text), and is a no-op once the compiled records are in place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedIfEmpty(db: any) {
  const old = await db.select({ id: s.projects.id }).from(s.projects).where(and(eq(s.projects.lgaId, LGA), like(s.projects.source, OLD_DEMO_SOURCE)));
  const any = await db.select({ id: s.projects.id }).from(s.projects).where(eq(s.projects.lgaId, LGA)).limit(1);
  if (old.length === 0 && any.length > 0) return;

  if (old.length > 0) {
    const ids = old.map((r: { id: string }) => r.id);
    await db.delete(s.statusUpdates).where(inArray(s.statusUpdates.projectId, ids));
    await db.delete(s.photoReports).where(inArray(s.photoReports.projectId, ids));
    for (const t of [s.projects, s.assets, s.services, s.profileSections, s.documents]) {
      await db.delete(t).where(and(eq(t.lgaId, LGA), like(t.source, OLD_DEMO_SOURCE)));
    }
  }

  const lga = {
    id: LGA,
    name: "Obio/Akpor",
    state: "Rivers",
    zone: "South South",
    headquarters: "Rumuodomaya",
    population: 462350,
    populationYear: 2006,
    populationSource: "National Population Commission 2006 census, via NBS Annual Abstract of Statistics 2011",
    lat: 4.855,
    lng: 6.99,
    intro:
      "Obio/Akpor is one of the two local government areas that make up the Port Harcourt metropolis.",
    demo: false,
    compiled: true,
  };
  await db.insert(s.lgas).values(lga).onConflictDoUpdate({ target: s.lgas.id, set: { ...lga, id: undefined } });

  await db.insert(s.projects).values(PROJECTS);
  await db.insert(s.assets).values(ASSETS);
  await db.insert(s.services).values(SERVICES);
  await db.insert(s.profileSections).values(PROFILE);
  await db.insert(s.documents).values(DOCUMENTS);
  for (const d of DOCUMENTS) {
    await db.insert(s.chunks).values(
      chunkText(d.body).map((text, ord) => ({ documentId: d.id, lgaId: LGA, visibility: d.visibility ?? "public", ord, text })),
    );
  }
  await db.execute(sql`SELECT 1`);
}
