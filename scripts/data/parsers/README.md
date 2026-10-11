# Data parsers

The Python scripts that produced `../faac-nbs-2024-08_2026-06.json` (FAAC allocations) and
`../../../src/db/profiles.json` (LGA profiles). `../SOURCES.md` describes the sources, checks and
caveats. Run every script from this folder; they read and write relative paths. Raw downloads go
under `raw/` and intermediate files are named `work_*.json`; neither is committed.

Requirements: Python 3.11, `openpyxl`, `pymupdf` (fitz), `pdfplumber` (only for `scan_pdfs.py`), curl.

## FAAC allocations

1. Download the NBS catalogue 156 workbooks into `raw/nbs/` and unpack each zip into
   `raw/nbs/x/<zip name without .zip>/`. The ids and file names are in `make_nbs_urls.py`; each URL is
   `https://microdata.nigerianstat.gov.ng/index.php/catalog/156/download/<id>/<file>`.
2. `python make_nbs_urls.py` maps every workbook to its download URL (`nbs_urls.json`).
3. `python parse_nbs_xlsx.py` reads each workbook's `LGC(s) Details` sheet into `work_nbs_rows.json`.
4. `python build_faac.py` checks each state-month against the workbook's own LGC summary sheet,
   drops groups that differ by more than N5, and writes `faac.json` and `faac_excluded_groups.json`.

`faac-nbs-2024-08_2026-06.json` is `faac.json` with the Kogi and Lokoja rows removed (see "App
import decisions" in `../SOURCES.md`); `scripts/import-faac.mjs` loads it into the database.

`validate_nbs.py` is the earlier diagnostic check, superseded by `build_faac.py`. `scan_pdfs.py`
lists which OAGF monthly PDFs (run inside `raw/oagf/`) have per-LGC tables.

## LGA profiles

1. Download `https://www.nigerianstat.gov.ng/pdfuploads/Annual_Abstract_of_Statistics_2011.pdf`
   to `raw/nbs-abstract/`, then `python parse_abstract_pop.py` (2006 population, `work_abstract_pop.json`).
2. Save `https://en.wikipedia.org/w/api.php?action=parse&oldid=1373216426&prop=wikitext|revid&format=json&formatversion=2`
   (the revision used) as `raw/wikipedia/lga_of_nigeria.json`,
   then `python wp_list.py` and `python wp_titles_manual.py` (article title per LGA).
3. `python fetch_wp.py` fetches each article's current revision (`work_wp_pages.json`).
4. `python build_profiles.py` writes `profiles.json`.

`fetch_wp.py` fetches the latest revisions, so a rerun can differ from the committed file
where articles have since been edited; the committed file cites the exact `oldid` it used.
`match_wikidata.py` was an exploratory Wikidata match that was not used (see `../SOURCES.md`).

## Name matching

`lgamatch.py` matches a state and printed council name to an id in `src/db/lgas.json`, using
`aliases.json` for spellings that differ. Keys listed in `aliases.json` `_inferred` were matched
by elimination and are flagged `matchInferred`.

## Provenance

These scripts were recovered on 11 Oct 2026 from the transcript of the session that wrote them
on 29 Sep 2026; the working folder itself was not kept. The only change since then is that
`lgamatch.py` finds `lgas.json` relative to this folder (or through `LGAS_JSON`) instead of an
absolute path. Checked the same day against fresh downloads: the FAAC steps reproduce
`faac-nbs-2024-08_2026-06.json` record for record (16,843 after the Kogi/Lokoja removal) and
`faac_excluded_groups.json` exactly, and `parse_abstract_pop.py` reproduces all 774
`population2006` values and page links in `profiles.json`. The Wikipedia fields were not re-run.
