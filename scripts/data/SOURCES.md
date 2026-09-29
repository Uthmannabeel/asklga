# AskLGA data sources (compiled 2026-09-29)

All files are in this folder. Raw downloads are under `raw/`. Nothing here is estimated: every value was parsed from a published file that is cited per record. Names are joined to `asklga/src/db/lgas.json` ids through `lgamatch.py` and `aliases.json`.

## 1. FAAC allocations per LGA: `faac.json`

**Source.** National Bureau of Statistics (NBS) Microdata catalogue 156, "Federation Account Allocation Committee (FAAC) Disbursement". The data comes from the Office of the Accountant-General of the Federation (OAGF). Each monthly workbook is OAGF's own disbursement workbook, and its `LGC(s) Details` sheet lists all 774 councils.
- Catalogue: https://microdata.nigerianstat.gov.ng/index.php/catalog/156 (accessed 2026-09-29)
- Each record's `sourceUrl` is the exact download. For files that come inside a zip, the URL is the zip followed by `#<file inside>`.
- The same tables are published as PDFs by OAGF at https://oagf.gov.ng/publications/faac-report/. I spot-checked rows against those PDFs (for example ABA NORTH, June 2026: 499,525,527.72 in both).
- **Licence/terms:** I found no explicit open licence. These are statutory government publications, so cite "OAGF via NBS".

**Coverage.** 16,887 records covering 22 disbursement months, 2024-08 to 2026-06, with **October 2024 missing** because NBS has no workbook for it. All 774 LGAs appear.
- 20 months are complete (774 rows each).
- 2024-11 has 677 rows and 2026-05 has 730 (see exclusions below).

**Period convention.** `period` is the month FAAC *shared* (disbursed) the money. It relates to revenue collected in the **previous** month, which is recorded as `revenueMonth`. For example, `period` 2026-06 is "month of May 2026, shared in June 2026".
- The period comes from the file name and NBS listing, not the sheet title.
- The Nov 2024 workbook's title wrongly says "September 2024 shared in August 2024" (a template error). Its rows are the October-revenue / November-disbursement data.

**Fields.**
- `netNgn` is the sheet's "Total Net Allocation" (called "Total Allocation" in Aug–Sep 2024).
- `deductionsNgn` is the LGC "Deduction" column, present only in months where the sheet has it. It is 0 for every LGC in the covered months, because deductions are applied at state level.
- **`grossNgn` is not provided.** The LGC sheet has no gross column. Its first column is labelled "Net Statutory Allocation", even though the summary sheet calls the same figures "Gross Statutory Allocation".
- `lines` holds every component column as published. Keys used:
  - `statutory`, `deduction`
  - `exchangeGain`, `emtl`, `solidMinerals`, `augmentation`
  - `grossEcology`, `ecologyTransferToNDDC`, `netEcology`
  - `vat`
  - `other:<header>` for one-off lines, such as "Distribution of ₦100Billion from Non-Oil Revenue" in Nov 2024 and the ₦178bn/₦200bn/₦250bn augmentations.
- `sourceName` is the council name as printed.
- `matchInferred: true` marks the 5 name mappings listed in section 4.

**Columns by month:**
- Every month has Net Statutory Allocation, the three ecology columns, VAT and Total.
- Deduction is present in most months. It is absent in 2025-03, 2025-10, 2025-11, 2025-12, 2026-01, 2026-02 and 2026-03.
- The other lines vary by month:
  - Exchange Gain: 2024-08 to 2025-01 and 2025-04 to 2025-09
  - EMTL: 2024-08 to 2026-01
  - Solid Minerals: 2024-08, 2025-03 and 2026-04
  - Augmentation: 2024-11, 2025-02, 2025-03, 2025-07, 2026-02, 2026-04 and 2026-05

**Validation.**
- For every month and state, the LGC rows were summed and compared with the same workbook's "Summary of Distribution of Revenue Allocation to Local Government Councils" sheet.
- 808 of 814 state-months reconcile to within ₦5.
- In every row (except the Kano case below), the components add up to the total.
- Each month has exactly 774 rows, all with unique ids.

**Excluded, because the LGC rows do not reconcile with the official state summary** (details in `faac_excluded_groups.json`):

| Period | State | Summary sheet | Sum of LGC rows | Difference | What is wrong |
|---|---|---|---|---|---|
| 2024-11 | Gombe | 5,328,243,230.67 | 5,387,882,762.33 | +59,639,531.66 | The LGC rows keep 100% of Gombe's ecology share (transfer 0). The summary transfers all of it to NDDC/HYPPADEC (net ecology 0). The two tables contradict each other; it is unclear which is right. |
| 2024-11 | Kaduna | 11,175,242,900.47 | 11,173,826,454.96 | −1,416,445.51 | The LGC rows transfer more than the gross ecology (net ecology is −1.42m in total), which is impossible. **The LGC rows are wrong.** |
| 2024-11 | Nasarawa | 5,224,470,048.41 | 5,223,763,054.23 | −706,994.18 | Same as Kaduna: net ecology is −0.71m. **The LGC rows are wrong.** |
| 2024-11 | Oyo | 14,934,935,700.01 | 14,937,049,093.96 | +2,113,393.95 | Gross ecology differs: 150.34m in the LGC rows vs 148.23m in the summary. Unclear which is right. |
| 2024-11 | Plateau | 7,340,091,215.45 | 7,339,261,682.96 | −829,532.49 | Gross ecology differs: 91.26m in the LGC rows vs 92.92m in the summary. Unclear which is right. |
| 2026-05 | Kano | 28,454,494,621.67 | 15,926,119,350.12 | −12,528,375,271.55 | For all 44 Kano LGCs, "Total Net Allocation" leaves out VAT. The gap equals exactly the summary's Kano LGC VAT (12,528,375,271.62). The OAGF PDF has the same error (AJINGI total 329,016,637.45 = statutory + augmentation + ecology, with VAT 270,116,809.39 left out). **The LGC totals are wrong**; the components are fine. |

The mismatches I first flagged for 2025-01 (Gombe, Imo, Jigawa) and 2025-02 (Ebonyi, Imo) were **my validator's fault, not the data's**. Those summary rows have a stray extra cell after the total. When checked against the "Total Net Allocation" column, all of them reconcile to within ₦0.03.

**Not yet parsed (history is available):**
- OAGF publishes 84 monthly disbursement PDFs, listed in `raw/oagf-links.txt` and all downloaded to `raw/oagf/`. They run from April 2019 to June 2026.
- **59 of them contain per-LGC tables.** The 25 without them are every month of 2021 and 2022, plus August 2019; those have state-level summaries only.
- OAGF's site has no files for January–March or May–July 2019.
- pdfplumber `extract_tables()` reads these tables cleanly, including headers, because the tables have rect borders. Parsing them would add roughly 2019–2020 and 2023 to July 2024, plus October 2024 (the gap in the NBS series). Use the same state-summary reconciliation gate.
- NBS also has a 2010 LGA-level FAAC PDF: https://www.nigerianstat.gov.ng/download/355 (saved as `raw/nbs/DisburSEMENT_NBS_2010.pdf`).
- I found no LGA-level FAAC data for 1999–2018 in machine-readable form.

## 2. LGA profiles: `profiles.json` (774 records)

Every record has `sources` (field → URL) and `licences` (field → licence).

**`population2006`: 774 of 774 LGAs.**
- Source: NBS *Annual Abstract of Statistics 2011*, Tables 16.1–52.1, "Population of <State> by Local Government Area, 1991 and 2006". The underlying source is the National Population Commission. https://www.nigerianstat.gov.ng/pdfuploads/Annual_Abstract_of_Statistics_2011.pdf (the `#page=` in each URL points to the table).
- Parsed from word positions. For each row, male + female = total was checked.
- **For all 37 state/FCT tables, the LGA rows sum exactly to the printed state total.** Grand total: 140,427,717.
- Caveat: these figures can differ from other published 2006 LGA figures. For example, Aba North is 107,488 here, but 106,844 on Wikipedia and citypopulation.de. The abstract appears to use a different release (provisional vs gazetted final) from those sites. Label it "2006 census (NBS Annual Abstract 2011)".
- The abstract's Taraba table also has a "*Disputed Areas" row (19,964) that belongs to no LGA; it is excluded.
- Licence: NBS publication, no explicit open licence found; cite NBS/NPC.
- The same abstract has NBS/NPC projections for 2008–2010 per LGA (Tables xx.2). **I did not extract them.**

**`headquarters` (329), `areaKm2` (689), `created` (51)**
- Source: the infobox of each LGA's English Wikipedia article, cited by permanent revision link (`oldid`). Licence: CC BY-SA 4.0 (attribution + share-alike).
- Article titles come from "Local government areas of Nigeria" (revision 1373216426), plus 17 titles I mapped by hand where that list is wrong. For example, it lists Ghari under Kano instead of Kunchi, and Ilishan-Remo/Isara under Ogun.
- A value is kept only if the infobox's state matches the app's state; 17 articles failed this check and were skipped.
- `created` is kept only where the infobox label explicitly says created/established/founded/inaugurated.
- Caveats:
  - Wikipedia's area figures often trace back to citypopulation.de, and some articles cite nothing.
  - Headquarters are volunteer-edited.
  - Treat these fields as lower confidence than the NBS figures.

**Not obtained:**
- `senatorialDistrict`: no source was verified in the time available. Candidates are INEC's delimitation lists or Wikipedia's per-district articles.
- Official current projections, such as NPC/NBS 2022.
- Other sources considered:
  - HDX `cod-ps-nga` (UNFPA / US Census Bureau modelled estimates, CC BY-IGO) is not an official NPC projection.
  - citypopulation.de: licence not checked, not used.
  - Wikidata (CC0) has 2006 figures copied from the same NBS abstract, and headquarters for only about 24 LGAs. Its item set is noisy (818 items, including non-LGAs), so I did not use it.

## 3. LGA chairmen / officials

**Not researched.** Only lgaportal.org was known, and scraping it is excluded. Some Wikipedia infoboxes have `leader_name` fields, but they are often years out of date. I did not use them.

## 4. Name matching (`aliases.json`)

- **FAAC:** 774/774 ids matched every month; 66 aliases are needed for OAGF spellings.
- **Population:** 774/774 matched, after 41 aliases for typos in the abstract (107 aliases in total).

Examples of well-established renames: Egbado North/South → yewa-north/south; MINNA → chanchaga; AIYEKIRE → gbonyin; KIYAWA (Zamfara) → birnin-magaji-kiyaw; OBIOMA NGWA → obi-ngwa.

**Inferred by elimination (confirm before publishing).** These are flagged `matchInferred` in faac.json:
- **Kogi: KOTON KARFE → lokoja.** OAGF lists both "KOGI" and "KOTON KARFE" and never "LOKOJA". Koton Karfe is actually the HQ of Kogi LGA, but the allocation sizes fit Lokoja (bigger population and area). **This is the least certain mapping.**
- **Oyo: IFELOJU → ibarapa-east.** Ifeloju is the pre-1996 parent LGA.
- **Oyo: IFEDAPO → surulere-oyo.** Same serial number, 33, as "SURULERE" in the 2010 NBS FAAC file.
- **Akwa Ibom: EKPE ATAI → nsit-atai, UQUO → esit-eket.** The 2010 file uses NSIT ATAI and ESIT EKET.
- **Population: "Nafada Bajoga" → nafada.**

**Unusual ids in `lgas.json`** you may want to fix in the app:
- ekere-ekeremor, sagba-sagbama, maiya-maiyama, ganju-ganjuwa
- obafemi-obafemi-owode, shaga-shagamu
- moya (Munya), kumi (Kurmi), unuimo (name "Onuimo")
- yakuur, wamako

## 5. Scripts (re-runnable)

- `parse_nbs_xlsx.py`: parses the workbooks into `work_nbs_rows.json`.
- `build_faac.py`: runs the reconciliation gate and writes `faac.json` and `faac_excluded_groups.json`.
- `validate_nbs.py`: diagnostic only (the old last-cell check, superseded by `build_faac.py`).
- `parse_abstract_pop.py`: 2006 population from the NBS abstract.
- `wp_list.py`, `fetch_wp.py`, `build_profiles.py`: the Wikipedia fields, and the build of `profiles.json`.
- `scan_pdfs.py`: shows which OAGF PDFs have LGA tables (`work_pdf_scan.json`).
- `lgamatch.py` + `aliases.json`: name matching.

## App import decisions (29 Sep 2026)

- **Kogi and Lokoja excluded** from `faac-nbs-2024-08_2026-06.json` (44 rows). OAGF lists "KOGI" and "KOTON KARFE" but never "LOKOJA", and Koton Karfe is Kogi LGA's own headquarters, so the pairing could be reversed. Both pages show "not loaded" until the mapping is confirmed.
- The other inferred mappings are kept: IFELOJU → Ibarapa East, IFEDAPO → Surulere (Oyo), EKPE ATAI → Nsit Atai, UQUO → Esit Eket (Uquo is Esit Eket's headquarters).
- **Correction to section 1:** council-level deductions are not always 0. Some councils (for example all 13 in Ebonyi in August 2024) carry a published deduction, printed as a negative number. Checked for Abakaliki, August 2024: statutory minus the deduction plus the other lines equals the published total exactly. The importer stores the deduction as a positive amount.
- Totals are stored in whole naira (rounded); the `lines` JSON keeps the published kobo.
- Independent spot check against the raw June 2026 workbook (`LGCs Details`): Obio/Akpor 1,472,496,571.86, Kano Municipal 783,675,441.39, Ikeja 2,436,926,801.69 all match.
