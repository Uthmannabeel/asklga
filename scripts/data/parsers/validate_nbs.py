import json, openpyxl, re, warnings, os, collections
from lgamatch import canon_state
warnings.filterwarnings("ignore")
rows = json.load(open("work_nbs_rows.json"))
urls = json.load(open("nbs_urls.json"))
by = collections.defaultdict(float); natl = collections.defaultdict(float)
for r in rows: by[(r["period"], r["state"])] += r["vals"]["total"]; natl[r["period"]] += r["vals"]["total"]
# component identity: total == statutory + other lines + netEcology + vat - deduction
cb = collections.Counter(); ex = {}
for r in rows:
    v = r["vals"]
    s = sum(x for k, x in v.items() if k not in ("total", "grossEcology", "ecologyTransferToNDDC", "deduction"))
    d = v.get("deduction", 0)
    if abs(s - v["total"]) > 1 and abs(s - abs(d) - v["total"]) > 1:
        cb[r["period"]] += 1; ex.setdefault(r["period"], (r["name"], v))
print("component identity failures by period:", dict(cb))
for p, e in ex.items(): print(" e.g.", p, e)
M = {m: i+1 for i, m in enumerate("january february march april may june july august september october november december".split())}
report = {}
for rel in sorted(urls):
    wb = openpyxl.load_workbook("raw/nbs/" + rel, data_only=True, read_only=True)
    fm = re.search(r"(january|february|march|april|may|june|july|august|september|october|november|december)[\W_]*(\d{4})", os.path.basename(rel), re.I)
    per = f"{fm.group(2)}-{M[fm.group(1).lower()]:02d}"
    found = None
    for ws in wb.worksheets:
        head = " ".join(str(c) for r in ws.iter_rows(max_row=5, values_only=True) for c in r if c)
        if re.search(r"summary\s+of\s+distribution.*local\s+government\s+councils", head, re.I | re.S):
            found = ws; break
    if not found: print(per, "no LGC summary sheet found"); continue
    n = mism = 0; grand = None
    for r in found.iter_rows(values_only=True):
        cells = [c for c in r if c is not None]
        nums = [c for c in cells if isinstance(c, (int, float))]
        labels = [c for c in cells if isinstance(c, str)]
        st = next((canon_state(c) for c in labels if canon_state(c)), None)
        if st and nums and not any(re.search("total", l, re.I) for l in labels):
            n += 1
            if abs(nums[-1] - by[(per, st)]) > 5: mism += 1; print("  MISMATCH", per, st, nums[-1], round(by[(per, st)], 2))
        if labels and any(re.fullmatch(r"\s*(grand\s+)?total\s*", l, re.I) for l in labels) and nums: grand = nums[-1]
    report[per] = {"sheet": found.title, "statesChecked": n, "stateMismatches": mism, "sheetGrandTotal": grand, "parsedTotal": round(natl[per], 2)}
    print(per, found.title, "states:", n, "mism:", mism, "grand:", grand, "parsed:", round(natl[per], 2))
json.dump(report, open("work_nbs_validation.json", "w"), indent=1)
