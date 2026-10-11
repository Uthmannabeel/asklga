import json, subprocess, urllib.parse, time, os
m = json.load(open("work_wp_titles.json"))
titles = sorted({v["title"] for v in m.values()})
os.makedirs("raw/wikipedia/pages", exist_ok=True)
res = {}
for i in range(0, len(titles), 50):
    batch = titles[i:i+50]
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "prop": "revisions", "rvprop": "content|ids|timestamp", "rvslots": "main", "redirects": 1, "format": "json", "formatversion": 2, "titles": "|".join(batch)})
    raw = subprocess.run(["curl", "-sS", "--ssl-no-revoke", "-A", "AskLGA-research/0.1 (uthmannabeel@gmail.com)", url], capture_output=True).stdout
    open(f"raw/wikipedia/pages/batch_{i//50:02d}.json", "wb").write(raw)
    d = json.loads(raw)["query"]
    redir = {r["from"]: r["to"] for r in d.get("redirects", [])}
    norm = {r["from"]: r["to"] for r in d.get("normalized", [])}
    pages = {p["title"]: p for p in d["pages"]}
    for t in batch:
        tt = norm.get(t, t); tt = redir.get(tt, tt)
        p = pages.get(tt)
        if p and "revisions" in p:
            rv = p["revisions"][0]
            res[t] = {"title": tt, "revid": rv["revid"], "timestamp": rv["timestamp"], "text": rv["slots"]["main"]["content"]}
        else:
            res[t] = None
    time.sleep(0.5)
json.dump(res, open("work_wp_pages.json", "w"))
print(len(res), sum(1 for v in res.values() if v))
