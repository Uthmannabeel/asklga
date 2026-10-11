"""Build faac.json from parsed NBS rows. Include a (period, state) group only if the sum of its LGC
'Total (Net) Allocation' rows reconciles to the same workbook's LGC summary sheet within N5."""
import json, openpyxl, re, warnings, os, collections
from lgamatch import canon_state
warnings.filterwarnings("ignore")
rows = json.load(open("work_nbs_rows.json"))
urls = json.load(open("nbs_urls.json"))
aliases = json.load(open("aliases.json")); inferred = set(aliases["_inferred"])
M = {m: i+1 for i, m in enumerate("january february march april may june july august september october november december".split())}
MN = {v: k.capitalize() for k, v in M.items()}
by = collections.defaultdict(float)
for r in rows: by[(r["period"], r["state"])] += r["vals"]["total"]
summary, bad = {}, {}
for rel in sorted(urls):
    wb = openpyxl.load_workbook("raw/nbs/" + rel, data_only=True, read_only=True)
    fm = re.search(r"(january|february|march|april|may|june|july|august|september|october|november|december)[\W_]*(\d{4})", os.path.basename(rel), re.I)
    per = f"{fm.group(2)}-{M[fm.group(1).lower()]:02d}"
    ws = next(w for w in wb.worksheets if re.search(r"summary\s+of\s+distribution.*local\s+government\s+councils",
              " ".join(str(c) for r in w.iter_rows(max_row=5, values_only=True) for c in r if c), re.I | re.S))
    R = list(ws.iter_rows(values_only=True))
    hi = next(i for i, r in enumerate(R) if any(isinstance(c, str) and c.strip().lower() == "state" for c in r))
    tcol = max(j for j, c in enumerate(R[hi]) if isinstance(c, str) and "total" in c.lower())
    scol = next(j for j, c in enumerate(R[hi]) if isinstance(c, str) and c.strip().lower() == "state")
    for r in R[hi+1:]:
        st = canon_state(r[scol]) if isinstance(r[scol], str) and "total" not in r[scol].lower() else None
        if st and isinstance(r[tcol], (int, float)):
            diff = by[(per, st)] - r[tcol]
            summary[(per, st)] = r[tcol]
            if abs(diff) > 5: bad[(per, st)] = {"period": per, "state": st, "summarySheet": round(r[tcol], 2), "sumOfLgcRows": round(by[(per, st)], 2), "difference": round(diff, 2), "summarySheetName": ws.title}
out, excluded = [], collections.Counter()
for r in rows:
    k = (r["period"], r["state"])
    if k not in summary: raise SystemExit(f"no summary for {k}")
    if k in bad: excluded[k] += 1; continue
    y, m = r["period"].split("-")
    v = r["vals"]
    rec = {"id": r["id"], "period": r["period"], "revenueMonth": r["revenueMonth"], "netNgn": v["total"]}
    if "deduction" in v: rec["deductionsNgn"] = v["deduction"]
    rec["source"] = f"NBS (data from OAGF), FAAC disbursement to Local Government Councils, {MN[int(m)]} {y}"
    rec["sourceUrl"] = r["source"]
    rec["sourceName"] = r["name"]
    rec["lines"] = {k2: v2 for k2, v2 in v.items() if k2 != "total"}
    from lgamatch import norm_keep_paren
    if f'{r["state"]}|{norm_keep_paren(r["name"])}' in inferred: rec["matchInferred"] = True
    out.append(rec)
out.sort(key=lambda x: (x["period"], x["id"]))
json.dump(out, open("faac.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(sorted(bad.values(), key=lambda x: (x["period"], x["state"])), open("faac_excluded_groups.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
per = collections.Counter(x["period"] for x in out)
print("records", len(out), "periods", len(per), "ids", len({x['id'] for x in out}))
print(dict(sorted(per.items())))
print("excluded groups:", [(k, n) for k, n in excluded.items()])
for b in sorted(bad.values(), key=lambda x: (x["period"], x["state"])): print(b)
