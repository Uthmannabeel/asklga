import csv, json, re
from lgamatch import LGAS, canon_state, match, norm
rows = list(csv.DictReader(open("raw/wikidata/wd_lga_parents.csv", encoding="utf-8")))
out, un = {}, []
for r in rows:
    states = [canon_state(p) for p in r["parents"].split("|") if canon_state(p)]
    if "Abuja" in r["parents"] or "Federal Capital Territory" in r["parents"]: states.append("Federal Capital Territory")
    st = states[0] if states else None
    name = re.sub(r",.*$", "", r["lgaLabel"]); name = re.sub(r"\s*\(.*\)$", "", name)
    name = re.sub(r"\s+(Local Government Area|LGA)$", "", name, flags=re.I)
    i = match(st, name) or match(st, r["lgaLabel"])
    if not i and st:
        # try loose: compare against app names in state ignoring 'north-east' punctuation variants
        cands = [x for x in LGAS if x["state"] == st and norm(x["name"]) == norm(name)]
        i = cands[0]["id"] if cands else None
    if i:
        out.setdefault(i, []).append({"qid": r["lga"].rsplit("/", 1)[1], "label": r["lgaLabel"], "enwiki": r["enwiki"]})
    else:
        un.append((st, r["lgaLabel"], r["parents"]))
missing = [x for x in LGAS if x["id"] not in out]
dups = {k: v for k, v in out.items() if len(v) > 1}
print("wikidata items", len(rows), "matched ids", len(out), "dups", len(dups), "unmatched items", len(un), "app ids missing", len(missing))
for u in un: print("  WD unmatched:", u)
print("APP missing:", [(x["state"], x["name"]) for x in missing])
print("DUPS:", {k: [y["label"] for y in v] for k, v in dups.items()})
json.dump(out, open("work_wd_map.json", "w"), indent=0)
