import json, re
from lgamatch import LGAS, canon_state, match, norm
t = json.load(open("raw/wikipedia/lga_of_nigeria.json"))["parse"]["wikitext"]
state = None; out = {}; un = []
for line in t.splitlines():
    m = re.match(r"^={2,4}\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*={2,4}", line) or re.match(r"^={2,4}\s*([^=]+?)\s*={2,4}", line)
    if m:
        s = canon_state(m.group(1).replace(" State", "")) or (("Federal Capital Territory") if "Capital" in m.group(1) or "Abuja" in m.group(1) else None)
        state = s; continue
    m = re.match(r"^\*\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", line)
    if m and state:
        title, label = m.group(1).strip(), (m.group(2) or m.group(1)).strip()
        label2 = re.sub(r"\s*\(.*\)$", "", re.sub(r",.*$", "", label))
        i = match(state, label2) or match(state, label)
        if i: out[i] = {"title": title, "label": label, "state": state}
        else: un.append((state, title, label))
miss = [(x["state"], x["name"]) for x in LGAS if x["id"] not in out]
print("matched", len(out), "unmatched", un, "\napp missing", miss)
json.dump(out, open("work_wp_titles.json", "w"), indent=0)
