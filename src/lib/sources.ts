/** Public data sources behind the national layer, shown on /about#sources. */
export const DATA_SOURCES: { data: string; publisher: string; url: string; coverage: string; licence: string }[] = [
  {
    data: "Federation Account (FAAC) allocations to each LGA",
    publisher: "Office of the Accountant-General of the Federation, published by the National Bureau of Statistics (microdata catalogue 156)",
    url: "https://microdata.nigerianstat.gov.ng/index.php/catalog/156",
    coverage: "22 months, Aug 2024 to Jun 2026 (Oct 2024 not published). A state-month is included only if its council rows add up to the official state summary.",
    licence: "Official statistics; cite OAGF and NBS",
  },
  {
    data: "Population, 2006 census",
    publisher: "National Population Commission, in the NBS Annual Abstract of Statistics 2011",
    url: "https://www.nigerianstat.gov.ng/pdfuploads/Annual_Abstract_of_Statistics_2011.pdf",
    coverage: "All 774 LGAs; every state table sums to its printed total",
    licence: "Official statistics; cite NPC and NBS",
  },
  {
    data: "Headquarters, land area, year created",
    publisher: "English Wikipedia LGA articles, cited by fixed revision",
    url: "https://en.wikipedia.org/wiki/Local_government_areas_of_Nigeria",
    coverage: "Headquarters 329, land area 689, year created 51 LGAs; kept only where the article's state matches",
    licence: "CC BY-SA 4.0",
  },
  {
    data: "LGA and state boundaries",
    publisher: "GRID3 Nigeria, via geoBoundaries",
    url: "https://www.geoboundaries.org/countryDownloads.html",
    coverage: "All 774 LGAs and 37 states, 2022 boundaries",
    licence: "CC BY 4.0",
  },
  {
    data: "List of LGAs and geopolitical zones",
    publisher: "Public list of Nigerian states and LGAs (npm nigerian-states-and-lgas), corrected against the boundary names",
    url: "https://www.npmjs.com/package/nigerian-states-and-lgas",
    coverage: "774 LGAs",
    licence: "ISC",
  },
];
