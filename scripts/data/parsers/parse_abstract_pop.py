"""2006 census LGA population from NBS Annual Abstract of Statistics 2011 (source: NPC)."""
import fitz, re, json, collections
from lgamatch import canon_state, match, LGAS
PDF = "raw/nbs-abstract/Annual_Abstract_of_Statistics_2011.pdf"
URL = "https://www.nigerianstat.gov.ng/pdfuploads/Annual_Abstract_of_Statistics_2011.pdf"
d = fitz.open(PDF)
NUM = re.compile(r"^\d{1,3}(,\d{3})+$|^\d{1,6}$")
state = None; recs = collections.defaultdict(list); totals = {}; pages = collections.defaultdict(set)
for pno in range(15, 120):
    pg = d[pno]; ws = pg.get_text("words")
    lines = collections.defaultdict(list)
    for w in ws: lines[round(w[1] / 4)].append(w)
    for k in sorted(lines):
        L = sorted(lines[k], key=lambda w: w[0]); text = " ".join(w[4] for w in L)
        m = re.search(r"TABLE\s+\d+\.\d+\s*:?\s*(PROJECTED\s+)?POPULATION OF (.+?) (STATE )?BY (?:LOCAL GOVERNMENT|COUNCIL AREA)", text, re.I)
        if m:
            state = None if m.group(1) else (canon_state(m.group(2)) or ("Federal Capital Territory" if "FCT" in m.group(2).upper() or "CAPITAL" in m.group(2).upper() else None))
            two_block = "1991" in text
            continue
        if re.match(r"TABLE\s", text): state = None; continue
        if not state: continue
        # segments: alpha words then exactly 3 numbers (male, female, total); take the right-most segment (2006)
        segs, cur_name, nums, x0 = [], [], [], None
        for w in L:
            t = w[4]
            if NUM.match(t):
                nums.append(int(t.replace(",", "")))
                if len(nums) == 3 and cur_name: segs.append((" ".join(cur_name), nums, x0)); cur_name, nums = [], []
            else:
                if nums: cur_name, nums = [], []
                if not cur_name: x0 = w[0]
                cur_name.append(t)
        if two_block: segs = [g for g in segs if g[2] > pg.rect.width * 0.4]
        if not segs: continue
        name, (ml, fl, tot), _ = segs[-1]
        if ml + fl != tot: continue
        pages[state].add(pno + 1)
        if name.lower().startswith("total"): totals[state] = tot; state = None
        else: recs[state].append((name, tot))
out, un, check = {}, [], {}
for st, rs in recs.items():
    s = sum(t for _, t in rs); check[st] = {"lgaRows": len(rs), "sum": s, "tableTotal": totals.get(st), "ok": totals.get(st) == s}
    for n, t in rs:
        i = match(st, n)
        if i and i not in out: out[i] = {"population2006": t, "srcName": n, "state": st, "pages": sorted(pages[st])}
        else: un.append((st, n, t, i))
print(json.dumps(check, indent=0)[:3000])
print("matched", len(out), "unmatched", len(un)); print(un)
json.dump({"records": out, "check": check, "unmatched": un}, open("work_abstract_pop.json", "w"), indent=0)
