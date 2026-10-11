import json, re, urllib.parse, collections
from lgamatch import LGAS, canon_state
titles = json.load(open("work_wp_titles.json")); pages = json.load(open("work_wp_pages.json"))
pop = json.load(open("work_abstract_pop.json"))["records"]
aliases = json.load(open("aliases.json")); inferred = set(aliases["_inferred"])
ABS_URL = "https://www.nigerianstat.gov.ng/pdfuploads/Annual_Abstract_of_Statistics_2011.pdf"

def clean(v):
    v = re.sub(r"<!--.*?-->", "", v, flags=re.S)
    v = re.sub(r"<ref[^>]*/>", "", v); v = re.sub(r"<ref[^>]*>.*?</ref>", "", v, flags=re.S)
    v = re.sub(r"\{\{[^{}]*\}\}", "", v)
    v = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", v)
    v = re.sub(r"<[^>]+>", " ", v); v = re.sub(r"'{2,}", "", v)
    v = re.split(r"\s*\|\s*\w+\s*=", v)[0]
    return re.sub(r"\s+", " ", v).strip(" ,;")

def infobox(text):
    m = re.search(r"\{\{\s*Infobox", text, re.I)
    if not m: return {}
    i, depth = m.start(), 0
    for j in range(i, len(text)):
        if text.startswith("{{", j): depth += 1
        elif text.startswith("}}", j):
            depth -= 1
            if depth == 0: break
    body = text[i:j]
    params = {}
    for part in re.split(r"\n\s*\|", body):
        if "=" in part:
            k, v = part.split("=", 1); params[k.strip().lower()] = v.strip()
    return params

stats = collections.Counter(); out = []
for x in LGAS:
    rec = {"id": x["id"], "sources": {}, "licences": {}}
    p = pop.get(x["id"])
    if p:
        rec["population2006"] = p["population2006"]
        rec["sources"]["population2006"] = f'{ABS_URL}#page={p["pages"][0]}'
        rec["licences"]["population2006"] = "NBS publication (Nigerian government statistical release; NBS states no explicit open licence) - cite NBS/NPC"
        rec["population2006Note"] = f'NBS Annual Abstract of Statistics 2011, state table of 2006 census population by LGA (source: National Population Commission); printed as "{p["srcName"]}"'
        stats["population2006"] += 1
    t = titles.get(x["id"]); pg = pages.get(t["title"]) if t else None
    if pg:
        ib = infobox(pg["text"])
        st_ok = any(canon_state(clean(ib.get(k, "")).replace(" State", "")) == x["state"] for k in ("subdivision_name1", "subdivision_name2"))
        if x["state"] == "Federal Capital Territory": st_ok = st_ok or "Federal Capital Territory" in clean(ib.get("subdivision_name1", "")) or "Abuja" in clean(ib.get("subdivision_name1", ""))
        url = "https://en.wikipedia.org/w/index.php?" + urllib.parse.urlencode({"title": pg["title"], "oldid": pg["revid"]})
        if st_ok:
            hq = None
            if clean(ib.get("seat", "")) and re.search(r"head|seat|capital", ib.get("seat_type", "") or "seat", re.I): hq = clean(ib["seat"])
            for n in range(1, 6):
                if not hq and re.search(r"head\s*quarter", clean(ib.get(f"subdivision_type{n}", "")), re.I) and clean(ib.get(f"subdivision_name{n}", "")):
                    hq = clean(ib[f"subdivision_name{n}"])
            if not hq and clean(ib.get("headquarters", "")): hq = clean(ib["headquarters"])
            if hq and 1 < len(hq) < 60 and not re.search(r"\d{3}", hq):
                rec["headquarters"] = hq; rec["sources"]["headquarters"] = url; rec["licences"]["headquarters"] = "CC BY-SA 4.0 (Wikipedia)"; stats["headquarters"] += 1
            for k in ("area_total_km2", "area_land_km2"):
                v = clean(ib.get(k, "")).replace(",", "")
                if re.fullmatch(r"\d+(\.\d+)?", v) and float(v) > 0:
                    rec["areaKm2"] = float(v); rec["sources"]["areaKm2"] = url; rec["licences"]["areaKm2"] = "CC BY-SA 4.0 (Wikipedia)"; stats["areaKm2"] += 1; break
            for n in ("", "1", "2", "3"):
                ttl = clean(ib.get(f"established_title{n}", "")); dt = clean(ib.get(f"established_date{n}", ""))
                y = re.search(r"\b(19[5-9]\d|20[0-2]\d)\b", dt)
                if y and re.search(r"creat|establish|found|inaugur", ttl, re.I):
                    rec["created"] = y.group(1); rec["sources"]["created"] = url; rec["licences"]["created"] = "CC BY-SA 4.0 (Wikipedia)"; stats["created"] += 1; break
        else:
            stats["wp_state_mismatch"] += 1
    if len(rec) > 3: out.append(rec)
json.dump(out, open("profiles.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), dict(stats))
