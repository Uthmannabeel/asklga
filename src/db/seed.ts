import { eq, sql } from "drizzle-orm";
import * as s from "./schema";

/**
 * Demo seed for the pilot LGA shape. Every record is illustrative and is labelled as such
 * in its `source` field; the LGA row carries demo = true so every public page shows a
 * demo banner. Real deployments replace this with records approved by the LGA data owner.
 */

const DEMO_SOURCE = "Demo seed (illustrative). Not an official record.";
const VERIFIED = "2026-09-20";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedIfEmpty(db: any) {
  // The demo is keyed on the demo LGA having records, not on the lgas table being empty: the
  // national directory fills that table with all 774 LGAs on every start.
  const existing = await db.select({ id: s.projects.id }).from(s.projects).where(eq(s.projects.lgaId, "obio-akpor")).limit(1);
  if (existing.length > 0) return;

  const demoLga = {
    id: "obio-akpor",
    name: "Obio/Akpor",
    state: "Rivers",
    zone: "South South",
    headquarters: "Rumuodomaya",
    population: 464789,
    populationYear: 2006,
    populationSource: "National Population Commission, 2006 census",
    lat: 4.855,
    lng: 6.99,
    intro:
      "Obio/Akpor is one of the two local government areas that make up the Port Harcourt metropolis. This portal answers questions about its services, projects, public assets and investment opportunities from approved records only.",
    demo: true,
  };
  await db.insert(s.lgas).values(demoLga).onConflictDoUpdate({ target: s.lgas.id, set: { ...demoLga, id: undefined } });

  const P = (
    n: number,
    v: Omit<typeof s.projects.$inferInsert, "id" | "lgaId" | "source" | "approval" | "lastVerified">,
  ): typeof s.projects.$inferInsert => ({
    id: `OBA-P-${String(n).padStart(4, "0")}`,
    lgaId: "obio-akpor",
    source: DEMO_SOURCE,
    approval: "approved",
    lastVerified: VERIFIED,
    ...v,
  });

  await db.insert(s.projects).values([
    P(1, {
      name: "Rumuokoro internal roads rehabilitation (phase 2)",
      type: "road",
      ward: "Rumuokoro",
      lat: 4.858,
      lng: 6.997,
      sponsor: "LGA",
      budgetYear: 2025,
      budgetLine: "Capital 23010101 (demo)",
      amountNgn: 185000000,
      contractor: "Not published",
      startDate: "2025-03",
      expectedCompletion: "2025-12",
      status: "ongoing",
      statusNote: "Asphalt laid on two of four streets at last site visit.",
      evidence: [{ url: "", caption: "Site visit: asphalt on Ikwerre Link Street", date: "2026-09-12" }],
    }),
    P(2, {
      name: "Choba primary health centre upgrade",
      type: "health",
      ward: "Choba",
      lat: 4.888,
      lng: 6.905,
      sponsor: "State",
      budgetYear: 2024,
      budgetLine: "Rivers State Health capital (demo)",
      amountNgn: 96000000,
      startDate: "2024-08",
      expectedCompletion: "2025-06",
      status: "completed",
      statusNote: "Commissioned. Maternity wing in use.",
      evidence: [{ url: "", caption: "Commissioning notice", date: "2025-07-02" }],
    }),
    P(3, {
      name: "Rukpokwu community market stalls (120 lock-up shops)",
      type: "market",
      ward: "Rukpokwu",
      lat: 4.9,
      lng: 6.985,
      sponsor: "LGA",
      budgetYear: 2025,
      amountNgn: 240000000,
      startDate: "2025-05",
      expectedCompletion: "2026-03",
      status: "stalled",
      statusNote: "No activity on site since February 2026. Reason not published.",
    }),
    P(4, {
      name: "Elelenwo drainage channel, Old Refinery Road section",
      type: "drainage",
      ward: "Elelenwo",
      lat: 4.828,
      lng: 7.05,
      sponsor: "Constituency",
      budgetYear: 2024,
      amountNgn: 60000000,
      status: "unknown",
      statusNote: "Listed in the 2024 constituency projects schedule. No site evidence yet.",
    }),
    P(5, {
      name: "Solar-powered boreholes, Ozuoba and Ogbogoro (4 units)",
      type: "water",
      ward: "Ozuoba/Ogbogoro",
      lat: 4.878,
      lng: 6.94,
      sponsor: "NDDC",
      budgetYear: 2023,
      amountNgn: 48000000,
      status: "completed",
      statusNote: "Three of four boreholes functional at last inspection; Ogbogoro unit needs a pump.",
      evidence: [{ url: "", caption: "Inspection photo, Ozuoba borehole 1", date: "2026-08-30" }],
    }),
    P(6, {
      name: "Rumuigbo model primary school, six-classroom block",
      type: "education",
      ward: "Rumuigbo",
      lat: 4.85,
      lng: 6.99,
      sponsor: "State",
      budgetYear: 2025,
      amountNgn: 132000000,
      startDate: "2025-09",
      expectedCompletion: "2026-08",
      status: "ongoing",
      statusNote: "Roofing stage.",
    }),
    P(7, {
      name: "Woji waterfront erosion control",
      type: "other",
      ward: "Woji",
      lat: 4.815,
      lng: 7.04,
      sponsor: "Federal",
      budgetYear: 2024,
      amountNgn: 410000000,
      status: "planned",
      statusNote: "Design stage. Contractor not yet announced.",
    }),
    P(8, {
      name: "Rumuomasi street lighting (solar, 80 poles)",
      type: "power",
      ward: "Rumuomasi",
      lat: 4.826,
      lng: 7.02,
      sponsor: "LGA",
      budgetYear: 2025,
      amountNgn: 56000000,
      startDate: "2025-11",
      expectedCompletion: "2026-02",
      status: "completed",
      statusNote: "72 of 80 poles working at last night inspection.",
    }),
    P(9, {
      name: "Rumuolumeni jetty access road",
      type: "road",
      ward: "Rumuolumeni",
      lat: 4.81,
      lng: 6.95,
      sponsor: "State",
      budgetYear: 2023,
      amountNgn: 320000000,
      status: "abandoned",
      statusNote: "Contract terminated in 2024 per state notice. No replacement contractor published.",
    }),
    P(10, {
      name: "Eliozu civic centre and library",
      type: "other",
      ward: "Eliozu",
      lat: 4.88,
      lng: 7.01,
      sponsor: "LGA",
      budgetYear: 2026,
      amountNgn: 150000000,
      status: "planned",
      statusNote: "In the 2026 budget. Site not yet cleared.",
    }),
    P(11, {
      name: "Rumuodara waste transfer station",
      type: "other",
      ward: "Rumuodara",
      lat: 4.855,
      lng: 7.01,
      sponsor: "State",
      budgetYear: 2025,
      amountNgn: 88000000,
      status: "ongoing",
      statusNote: "Perimeter fence complete; hard standing in progress.",
    }),
    P(12, {
      name: "Rumuodomaya secretariat records digitisation",
      type: "other",
      ward: "Rumuodomaya",
      lat: 4.868,
      lng: 6.998,
      sponsor: "LGA",
      budgetYear: 2026,
      amountNgn: 12000000,
      status: "ongoing",
      statusNote: "Council minutes 2018 to 2025 scanned. Budgets in progress.",
    }),
  ]);

  const A = (
    n: number,
    v: Omit<typeof s.assets.$inferInsert, "id" | "lgaId" | "source" | "approval" | "lastVerified">,
  ): typeof s.assets.$inferInsert => ({
    id: `OBA-A-${String(n).padStart(4, "0")}`,
    lgaId: "obio-akpor",
    source: DEMO_SOURCE,
    approval: "approved",
    lastVerified: VERIFIED,
    ...v,
  });

  await db.insert(s.assets).values([
    A(1, { name: "Rumuodomaya LGA secretariat", type: "other", ward: "Rumuodomaya", lat: 4.868, lng: 6.998, condition: "good", lastInspected: "2026-09-01", notes: "Council chamber, chairman's office, revenue, works and health departments." }),
    A(2, { name: "Choba primary health centre", type: "health", ward: "Choba", lat: 4.888, lng: 6.905, condition: "good", lastInspected: "2026-08-15", notes: "Maternity, immunisation, outpatient. Open 8am to 4pm weekdays; 24h maternity." }),
    A(3, { name: "Rumuokoro motor park", type: "market", ward: "Rumuokoro", lat: 4.859, lng: 6.995, condition: "fair", lastInspected: "2026-07-20", notes: "Interstate and intra-city loading bays. Drainage poor in rainy season." }),
    A(4, { name: "Rumuigbo model primary school", type: "school", ward: "Rumuigbo", lat: 4.85, lng: 6.99, condition: "fair", lastInspected: "2026-06-10", notes: "Eight classrooms in use; new block under construction (see project OBA-P-0006)." }),
    A(5, { name: "Ozuoba solar borehole 1", type: "water", ward: "Ozuoba/Ogbogoro", lat: 4.878, lng: 6.94, condition: "good", lastInspected: "2026-08-30", notes: "Functional." }),
    A(6, { name: "Ogbogoro solar borehole", type: "water", ward: "Ozuoba/Ogbogoro", lat: 4.882, lng: 6.935, condition: "poor", lastInspected: "2026-08-30", notes: "Pump failed. Repair pending." }),
    A(7, { name: "Rumuomasi main market", type: "market", ward: "Rumuomasi", lat: 4.827, lng: 7.021, condition: "fair", lastInspected: "2026-07-20", notes: "Approximately 600 stalls. Market days daily." }),
    A(8, { name: "Elelenwo primary health centre", type: "health", ward: "Elelenwo", lat: 4.829, lng: 7.052, condition: "poor", lastInspected: "2026-05-05", notes: "Roof leaks in the immunisation room. Listed for rehabilitation." }),
  ]);

  const S = (
    n: number,
    v: Omit<typeof s.services.$inferInsert, "id" | "lgaId" | "source" | "approval" | "lastVerified">,
  ): typeof s.services.$inferInsert => ({
    id: `OBA-S-${String(n).padStart(4, "0")}`,
    lgaId: "obio-akpor",
    source: DEMO_SOURCE,
    approval: "approved",
    lastVerified: VERIFIED,
    ...v,
  });

  await db.insert(s.services).values([
    S(1, {
      name: "Local government identification letter",
      category: "Identity and records",
      summary: "A letter confirming that you are an indigene or resident of the LGA, used for school admission, employment and some federal applications.",
      eligibility: "Indigenes of Obio/Akpor, or residents with proof of address.",
      documents: ["Completed application form", "Passport photograph (2)", "Proof of address or letter from your community head", "Valid ID (NIN slip, voter's card or passport)"],
      steps: ["Collect and complete the form at the Registry", "Submit with your documents to the Registry desk", "Collect the signed letter on the date written on your slip"],
      office: "Registry, LGA secretariat, Rumuodomaya",
      role: "Registry officer",
      contact: "Front desk, Registry (Room 4)",
      turnaround: "3 working days",
    }),
    S(2, {
      name: "Customary marriage registration",
      category: "Identity and records",
      summary: "Registers a customary marriage and issues a certificate.",
      eligibility: "Couples married under customary law where at least one party resides in the LGA.",
      documents: ["Both parties' valid ID", "Two witnesses with ID", "Passport photographs (2 each)", "Sworn affidavit of marriage"],
      steps: ["Book a date at the Marriage Registry", "Attend with witnesses and documents", "Sign the register and collect the certificate"],
      office: "Marriage Registry, LGA secretariat",
      role: "Marriage registrar",
      contact: "Marriage Registry (Room 7)",
      turnaround: "Same day after the appointment",
    }),
    S(3, {
      name: "Business premises registration",
      category: "Business",
      summary: "Registers a shop, office or workshop operating within the LGA.",
      eligibility: "Any business with a physical premises in Obio/Akpor.",
      documents: ["CAC certificate or business name", "Utility bill or tenancy agreement for the premises", "Owner's ID"],
      steps: ["Submit documents at the Revenue department", "Premises inspection by a revenue officer", "Collect the registration certificate"],
      office: "Revenue department, LGA secretariat",
      role: "Revenue officer (business premises)",
      contact: "Revenue department (Rooms 10 to 12)",
      turnaround: "5 working days",
    }),
    S(4, {
      name: "Market stall allocation",
      category: "Business",
      summary: "Allocates a stall in an LGA-owned market.",
      eligibility: "Traders resident in the LGA. Allocation depends on availability in the market requested.",
      documents: ["Application letter naming the market", "Valid ID", "Passport photographs (2)"],
      steps: ["Apply at the Markets unit", "Your name goes on the waiting list for that market", "The market master notifies you when a stall is free"],
      office: "Markets unit, Works and Environment department",
      role: "Market master for the named market",
      contact: "Markets unit (Room 15)",
      turnaround: "Depends on availability",
    }),
    S(5, {
      name: "Birth attestation letter",
      category: "Identity and records",
      summary: "An LGA letter attesting to a birth for use where an NPC birth certificate is not available. Birth registration itself is done by the National Population Commission.",
      eligibility: "Parents or guardians of a child born in the LGA.",
      documents: ["Hospital or traditional birth attendant record, or sworn affidavit", "Parent's ID", "Passport photograph of the child"],
      steps: ["Submit at the Registry", "Collect the letter"],
      office: "Registry, LGA secretariat",
      role: "Registry officer",
      contact: "Registry (Room 4)",
      turnaround: "2 working days",
    }),
    S(6, {
      name: "Immunisation for children",
      category: "Health",
      summary: "Routine childhood immunisation at LGA primary health centres.",
      eligibility: "All children under five.",
      documents: ["Child's immunisation card if you have one"],
      steps: ["Go to your nearest primary health centre on an immunisation day", "Bring the card; a new one is issued if you have none"],
      office: "Any LGA primary health centre",
      role: "Immunisation officer",
      contact: "Choba PHC, Elelenwo PHC, and other centres listed under assets",
      turnaround: "Same day",
    }),
    S(7, {
      name: "Waste collection complaint",
      category: "Environment",
      summary: "Report uncollected waste or an illegal dump site.",
      eligibility: "Any resident.",
      documents: [],
      steps: ["Report the street and nearest landmark to the Environment unit", "A sanitation officer inspects within the week"],
      office: "Works and Environment department",
      role: "Sanitation officer",
      contact: "Environment unit (Room 16)",
      turnaround: "Inspection within 5 working days",
    }),
    S(8, {
      name: "Signage and advertisement permit",
      category: "Business",
      summary: "Permit for shop signs, billboards and banners on public roads within the LGA.",
      eligibility: "Businesses and advertisers within the LGA. Large billboards may also need state approval.",
      documents: ["Sketch or photo of the sign with dimensions", "Location description", "Business registration"],
      steps: ["Submit at the Revenue department", "Site inspection", "Collect the permit"],
      office: "Revenue department",
      role: "Revenue officer (signage)",
      contact: "Revenue department (Rooms 10 to 12)",
      turnaround: "7 working days",
    }),
    S(9, {
      name: "Primary school enrolment",
      category: "Education",
      summary: "Enrolment into an LGA primary school.",
      eligibility: "Children aged 5 and above resident in the LGA.",
      documents: ["Birth certificate or attestation", "Immunisation card", "Passport photographs (2)"],
      steps: ["Visit the school nearest to you at the start of term", "The head teacher registers the child"],
      office: "Nearest LGA primary school",
      role: "Head teacher",
      contact: "See schools under assets",
      turnaround: "Same day",
    }),
    S(10, {
      name: "Community project request",
      category: "Projects",
      summary: "How a community or ward proposes a project for the next LGA budget.",
      eligibility: "Community development committees and ward councillors.",
      documents: ["Written proposal with location and need", "Minutes of the community meeting endorsing it"],
      steps: ["Submit to your ward councillor or the Planning unit before the budget call in September", "Proposals are considered at the budget hearing", "Accepted projects appear in the next budget and on this portal"],
      office: "Planning, Research and Statistics unit",
      role: "Planning officer",
      contact: "Planning unit (Room 20)",
      turnaround: "Decided at the annual budget hearing",
    }),
    S(11, {
      name: "Report a broken public asset",
      category: "Projects",
      summary: "Report a failed borehole, a broken street light, a damaged culvert or a leaking public building.",
      eligibility: "Any resident.",
      documents: [],
      steps: ["Report the asset and location, with a photo if possible, on this portal or at the Works department", "The Works department inspects and updates the asset record"],
      office: "Works and Environment department",
      role: "Works engineer",
      contact: "Works department (Room 18)",
      turnaround: "Inspection within 10 working days",
    }),
    S(12, {
      name: "Investor enquiry",
      category: "Investment",
      summary: "First contact for anyone considering a business or development in the LGA. The Planning unit routes you to the right state or LGA office.",
      eligibility: "Local or diaspora investors.",
      documents: ["A short description of the proposed investment and preferred location"],
      steps: ["Submit an enquiry on this portal or at the Planning unit", "The Planning unit replies with the approvals and contacts that apply"],
      office: "Planning, Research and Statistics unit",
      role: "Planning officer (investment desk)",
      contact: "Planning unit (Room 20)",
      turnaround: "Reply within 5 working days",
    }),
  ]);

  const I = (
    ord: number,
    section: string,
    title: string,
    body: string,
  ): typeof s.profileSections.$inferInsert => ({
    id: `OBA-I-${section}`,
    lgaId: "obio-akpor",
    section,
    title,
    body,
    ord,
    source: DEMO_SOURCE,
    approval: "approved",
    lastVerified: VERIFIED,
  });

  await db.insert(s.profileSections).values([
    I(1, "location", "Location and people",
      "Obio/Akpor lies north and east of Port Harcourt city and forms the larger part of the Port Harcourt metropolitan area. The headquarters is at Rumuodomaya. The 2006 census counted 464,789 people; current estimates are higher. The population is largely Ikwerre with a large mix of residents from across Nigeria. English and Pidgin are spoken everywhere; Ikwerre is the indigenous language."),
    I(2, "land", "Land and sites",
      "Land is held under customary ownership by families and communities, with the state government holding the statutory title. An investor acquires land by agreement with the family or community and then applies to the Rivers State Ministry of Lands for a Certificate of Occupancy. The LGA does not allocate private land. The LGA can identify community land available for lease and introduce investors to the community heads. Industrial and commercial land clusters along the East-West Road, the Airport Road corridor and around Choba and Rumuokoro."),
    I(3, "markets", "Markets and commerce",
      "Major markets: Rumuokoro, Rumuomasi, Rumuodara and Choba, plus daily neighbourhood markets in most wards. The LGA hosts the University of Port Harcourt at Choba, which anchors a large student rental and services economy. Rumuokoro motor park is the busiest transport hub in the metropolis. Commercial banks, fuel stations, hotels and shopping plazas line the Airport Road, Ikwerre Road and East-West Road corridors."),
    I(4, "infrastructure", "Infrastructure",
      "Roads: the East-West Road (federal), Ikwerre Road and Airport Road (state) are the trunk routes; internal roads are LGA responsibility and vary in condition. Power: served by the Port Harcourt Electricity Distribution Company; supply is intermittent and most businesses run generators or solar. Water: no piped public supply; boreholes are the norm. Telecoms: all national mobile networks with 4G in most wards. Health: LGA primary health centres in most wards; tertiary care at the University of Port Harcourt Teaching Hospital in Choba. Education: LGA primary schools, state secondary schools, the University of Port Harcourt."),
    I(5, "approvals", "Approvals an investor will need",
      "Business premises registration is issued by the LGA Revenue department. Signage permits are LGA. Building plan approval and Certificates of Occupancy are Rivers State (Ministry of Lands and the Physical Planning agency). Environmental impact assessment for larger projects is federal (Federal Ministry of Environment) with state participation. Company registration is federal (Corporate Affairs Commission). The LGA Planning unit will tell you which of these apply to your proposal and introduce you to the state offices."),
    I(6, "incentives", "Incentives",
      "Rivers State operates investment promotion through its investment agency and offers sector-specific support, particularly in agriculture and agro-processing. Federal incentives such as pioneer status apply through the Nigerian Investment Promotion Commission. The LGA itself offers no tax holiday but can waive or stage some LGA levies for projects that create local employment, at the discretion of the council."),
    I(7, "contacts", "Contacts",
      "First contact: the Investor enquiry service on this portal, handled by the Planning, Research and Statistics unit at the secretariat, Rumuodomaya. State: Rivers State investment promotion agency and the Ministry of Commerce and Industry. Federal: Nigerian Investment Promotion Commission. Community: the LGA introduces investors to the relevant community development committee for land discussions."),
  ]);

  const docs: (typeof s.documents.$inferInsert)[] = [
    {
      id: "OBA-D-0001",
      lgaId: "obio-akpor",
      title: "2025 approved budget, capital projects extract",
      kind: "budget",
      visibility: "public",
      source: DEMO_SOURCE,
      approval: "approved",
      reviewBy: "2027-01-31",
      body: `Obio/Akpor Local Government Council. Approved budget 2025. Extract of capital expenditure lines relevant to this portal.

Roads and drainage: Rumuokoro internal roads rehabilitation phase 2, N185,000,000. Rumuodara to Eliozu link road design, N8,000,000.

Markets: Rukpokwu community market, 120 lock-up shops, N240,000,000.

Power: Rumuomasi solar street lighting, 80 poles, N56,000,000.

Environment: Rumuodara waste transfer station (state counterpart funding), N20,000,000 LGA share.

Total capital vote 2025 (demo figure): N1,420,000,000.`,
    },
    {
      id: "OBA-D-0002",
      lgaId: "obio-akpor",
      title: "Council notice: market stall waiting lists",
      kind: "notice",
      visibility: "public",
      source: DEMO_SOURCE,
      approval: "approved",
      reviewBy: "2026-12-31",
      body: `Notice from the Markets unit, Works and Environment department, dated 1 August 2026.

All allocations of stalls in LGA-owned markets are made from the waiting list kept by the market master of each market. Traders should not pay any person for a stall. Allocation letters are signed by the Head of the Markets unit and stamped at the secretariat.

Current waiting lists: Rumuokoro market 214 names; Rumuomasi market 96 names; Rumuodara market 41 names. Rukpokwu community market will open its list when construction completes.`,
    },
    {
      id: "OBA-D-0003",
      lgaId: "obio-akpor",
      title: "Council minutes, 14 May 2026 (extract)",
      kind: "minutes",
      visibility: "public",
      source: DEMO_SOURCE,
      approval: "approved",
      reviewBy: "2027-05-14",
      body: `Minutes of the ordinary meeting of the Obio/Akpor Legislative Council held on 14 May 2026. Extract.

Item 4, Rukpokwu community market. The Works supervisor reported that the contractor left site in February 2026. Council resolved to write to the contractor demanding a resumption date within 30 days and to report at the next sitting.

Item 6, Ogbogoro borehole. Council noted the failed pump and directed the Works department to obtain three quotations for replacement.

Item 7, Records digitisation. Council approved N12,000,000 in the 2026 budget for scanning council minutes and budgets from 2018 and making them available to the public through the information portal.`,
    },
    {
      id: "OBA-D-0004",
      lgaId: "obio-akpor",
      title: "Internal memo: standby generator fuel allocation (internal)",
      kind: "memo",
      visibility: "internal",
      source: DEMO_SOURCE,
      approval: "approved",
      reviewBy: "2026-12-31",
      body: `Memo from the Director of Administration to all heads of department, 3 September 2026.

Fuel for the secretariat standby generator is allocated at 120 litres per working day. Departments requiring power outside 8am to 4pm must request it in writing a day ahead. The generator log is kept by the Works department and reviewed weekly.`,
    },
  ];
  await db.insert(s.documents).values(docs);

  for (const d of docs) {
    const parts = chunkText(d.body);
    await db.insert(s.chunks).values(
      parts.map((text, ord) => ({
        documentId: d.id,
        lgaId: d.lgaId,
        visibility: d.visibility ?? "public",
        ord,
        text,
      })),
    );
  }

  await db.execute(sql`SELECT 1`);
}
