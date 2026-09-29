/** Public data sources behind the national layer, shown on /about#sources. */
export const DATA_SOURCES: { data: string; publisher: string; url: string; coverage: string; licence: string }[] = [
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
