"""Parse the 'LGC(s) Details' sheet of the OAGF disbursement workbooks republished by NBS."""
import openpyxl, re, json, glob, os, sys, warnings
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lgamatch import canon_state, match

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
NBS = os.path.join(HERE, "raw", "nbs")
MONTHS = {m: i + 1 for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july",
                                          "august", "september", "october", "november", "december"])}

# NBS download URLs (catalog 156) for each workbook, keyed by local relative path
URLS = json.load(open(os.path.join(HERE, "nbs_urls.json")))


def key_of(col):
    c = re.sub(r"\s+", " ", str(col)).strip().lower()
    if "total" in c and ("net allocation" in c or c.endswith("total allocation") or c == "total allocation"):
        return "total"
    if c.startswith("net statutory") or c.startswith("gross statutory") or c == "statutory allocation":
        return "statutory"
    if c == "deduction" or c == "deductions":
        return "deduction"
    if "transfer of" in c and "ecology" in c:
        return "ecologyTransferToNDDC"
    if c.startswith("net share of ecology"):
        return "netEcology"
    if c.startswith("total share of ecology"):
        return "grossEcology"
    if "value added tax" in c or c == "vat":
        return "vat"
    if "exchange gain" in c:
        return "exchangeGain"
    if "emtl" in c or "electronic money" in c:
        return "emtl"
    if "solid mineral" in c:
        return "solidMinerals"
    if "augmentation" in c:
        return "augmentation"
    if "exchange difference" in c:
        return "exchangeDifference"
    if "forex" in c:
        return "forexEqualisation"
    return "other:" + c


def parse(path):
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = [w for w in wb.worksheets if re.search(r"lgc?s?\s*details", w.title, re.I)][0]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    title = " ".join(str(c) for r in rows[:4] for c in r if c)
    m = re.search(r"shared\s+in\s+([A-Za-z]+),?\s*(\d{4})", title, re.I)
    rm = re.search(r"month\s+of\s+([A-Za-z]+),?\s*(\d{4})", title, re.I)
    fm = re.search(r"(january|february|march|april|may|june|july|august|september|october|november|december)[\W_]*(\d{4})",
                   os.path.basename(path), re.I)
    period = f"{fm.group(2)}-{MONTHS[fm.group(1).lower()]:02d}"  # disbursement ("shared in") month, from file name
    y, mo = int(fm.group(2)), MONTHS[fm.group(1).lower()]
    revenue = f"{y if mo > 1 else y - 1}-{(mo - 1) or 12:02d}"  # revenue month = previous month
    title_period = f"{m.group(2)}-{MONTHS[m.group(1).lower()]:02d}" if m else None
    title_rev = f"{rm.group(2)}-{MONTHS[rm.group(1).lower()]:02d}" if rm else None
    if title_period != period or title_rev != revenue:
        print("TITLE MISMATCH", path, "title:", title_rev, "->", title_period, "file:", period)
    hi = next(i for i, r in enumerate(rows) if any(c and str(c).strip().lower() == "local government councils" for c in r))
    hdr = rows[hi]
    # blocks: each 'Local Government Councils' header col; state col is the nearest 'State(s)' header to its left
    blocks = []
    lgcols = [j for j, c in enumerate(hdr) if c and str(c).strip().lower() == "local government councils"]
    for bi, j in enumerate(lgcols):
        end = lgcols[bi + 1] if bi + 1 < len(lgcols) else len(hdr)
        st = max(k for k in range(0, j) if hdr[k] and re.match(r"states?$", str(hdr[k]).strip(), re.I))
        cols = {}
        for k in range(j + 1, end):
            if hdr[k] is None or re.match(r"(s/n|states?)$", str(hdr[k]).strip(), re.I):
                if cols:
                    break
                continue
            cols[k] = key_of(hdr[k])
        blocks.append((st, j, cols))
    out, raw_headers = [], [str(hdr[k]).strip() for k in blocks[0][2]]
    for st, j, cols in blocks:
        snc = max(k for k in range(0, j) if hdr[k] and str(hdr[k]).strip().lower() == "s/n")
        # Segment rows by the LGC serial number restarting at 1; the state label (a merged cell) may sit on
        # any row of the segment, so resolve the state per segment rather than carrying it forward.
        segs, cur = [], None
        for r in rows[hi + 1:]:
            if j >= len(r):
                continue
            sn = r[snc]
            if sn == 1 or (cur is None and isinstance(sn, (int, float))):
                cur = {"labels": [], "recs": []}
                segs.append(cur)
            if cur is None:
                continue
            if r[st]:
                s = canon_state(r[st])
                if s:
                    cur["labels"].append(s)
            name = r[j]
            if not name or not isinstance(name, str) or re.search(r"total", name, re.I):
                continue
            vals = {}
            for k, key in cols.items():
                v = r[k] if k < len(r) else None
                if isinstance(v, (int, float)):
                    vals[key] = round(float(v), 2)
            if "total" not in vals:
                continue
            cur["recs"].append({"name": name.strip(), "vals": vals})
        for sg in segs:
            labs = list(dict.fromkeys(sg["labels"]))
            if len(labs) != 1:
                print("STATE LABEL PROBLEM", os.path.basename(path), labs, [x["name"] for x in sg["recs"]][:3])
            for x in sg["recs"]:
                out.append({"state": labs[0] if labs else None, **x})
    return period, revenue, raw_headers, out


def main():
    results, report = [], []
    for rel, url in sorted(URLS.items()):
        path = os.path.join(NBS, rel)
        period, revenue, hdrs, recs = parse(path)
        un = []
        for r in recs:
            r["id"] = match(r["state"], r["name"])
            if not r["id"]:
                un.append(f'{r["state"]}|{r["name"]}')
        ids = [r["id"] for r in recs if r["id"]]
        report.append({"file": rel, "period": period, "revenueMonth": revenue, "rows": len(recs),
                       "matched": len(ids), "uniqueIds": len(set(ids)), "unmatched": un, "columns": hdrs,
                       "sumTotal": round(sum(r["vals"]["total"] for r in recs), 2)})
        for r in recs:
            results.append({**r, "period": period, "revenueMonth": revenue, "source": url})
    json.dump(results, open(os.path.join(HERE, "work_nbs_rows.json"), "w"), indent=0)
    json.dump(report, open(os.path.join(HERE, "work_nbs_report.json"), "w"), indent=1)
    for x in report:
        print(x["period"], x["rows"], x["matched"], x["uniqueIds"], len(x["unmatched"]), x["columns"])
    allun = sorted({u for x in report for u in x["unmatched"]})
    print(len(allun), allun)


if __name__ == "__main__":
    main()
