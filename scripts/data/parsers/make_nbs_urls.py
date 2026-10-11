"""Map each downloaded NBS workbook (raw/nbs/, zips unpacked to raw/nbs/x/<zip name>/) to its catalogue 156 download URL."""
import json, glob, os
B = "https://microdata.nigerianstat.gov.ng/index.php/catalog/156/download/"
ids = {"FAAC_Disbursement_August_2024.xlsx": "1125", "Disbursement_September_2024.xlsx": "1153", "Disbursement_November_2024.xlsx": "1204", "Disbursement_December_2024.xlsx": "1205",
       "FAAC_REPORT_JAN-JUNE_2025": "1268", "FAAC_July-August_2025": "1291", "FAAC_SEPT_OCT_NOV_2025": "1331", "FAAC_December_2025": "1349", "FAAC_Report_January_2026": "1373",
       "FAAC_Report_February_2026": "1391", "FAAC_Report_March_2026": "1396", "FAAC_Report_April_2026": "1423", "FAAC_May_June_2026": "1437"}
u = {}
for f in glob.glob("raw/nbs/**/*.xlsx", recursive=True):
    rel = os.path.relpath(f, "raw/nbs").replace("\\", "/")
    top = rel.split("/")
    if top[0] == "x":
        z = top[1]; u[rel] = B + ids[z] + "/" + z + ".zip#" + top[-1]
    else:
        u[rel] = B + ids[rel] + "/" + rel
json.dump(u, open("nbs_urls.json", "w"), indent=1); print(len(u))
