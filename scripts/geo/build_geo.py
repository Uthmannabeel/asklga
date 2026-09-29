"""
Usage: download the two simplified GeoJSON files into scripts/geo/boundaries/ (not committed):
  https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson -> ngaADM1_simplified.geojson
  https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2_simplified.geojson -> ngaADM2_simplified.geojson
then run: python scripts/geo/build_geo.py   (add --check to report name matching only)

Build compact SVG geometry for AskLGA from geoBoundaries (GRID3, CC BY 4.0).

Output: geo.json = {
  source, licence,
  states: { code: { name, box:[w,h], lgas: { lgaId: "M..Z" }, outline: "M..Z" (in national frame) } },
  national: { box:[w,h], states: { code: "M..Z" } }
}
Each state is projected into its own frame (width 400) so a state page ships only its own paths.
"""
import json, math, re, sys, unicodedata
from pathlib import Path

HERE = Path(__file__).parent
ADM1 = json.load(open(HERE / "boundaries/ngaADM1_simplified.geojson", encoding="utf-8"))
ADM2 = json.load(open(HERE / "boundaries/ngaADM2_simplified.geojson", encoding="utf-8"))
REPO = HERE.parent.parent
LGAS = json.load(open(REPO / "src/db/lgas.json", encoding="utf-8"))
TILES = {  # state name in lgas.json -> code (matches src/lib/ngTiles.ts)
    "Sokoto": "SO", "Zamfara": "ZA", "Katsina": "KT", "Kano": "KN", "Jigawa": "JI", "Yobe": "YO", "Borno": "BO",
    "Kebbi": "KE", "Niger": "NI", "Kaduna": "KD", "Bauchi": "BA", "Gombe": "GO", "Adamawa": "AD", "Oyo": "OY",
    "Kwara": "KW", "Federal Capital Territory": "FC", "Nasarawa": "NA", "Plateau": "PL", "Taraba": "TA", "Ogun": "OG",
    "Osun": "OS", "Ekiti": "EK", "Kogi": "KO", "Benue": "BE", "Lagos": "LA", "Ondo": "ON", "Edo": "ED", "Anambra": "AN",
    "Enugu": "EN", "Ebonyi": "EB", "Delta": "DE", "Imo": "IM", "Abia": "AB", "Cross River": "CR", "Bayelsa": "BY",
    "Rivers": "RI", "Akwa Ibom": "AK",
}
ADM1_NAME = {"Abuja Federal Capital Territory": "Federal Capital Territory"}


def norm(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    s = s.replace("&", " ").replace("-", " ").replace("/", " ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def polys(geom):
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


def ring_area(r):
    return sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1)) / 2


def centroid(geom):
    best = max((p[0] for p in polys(geom)), key=lambda r: abs(ring_area(r)))
    a = ring_area(best) or 1e-12
    cx = sum((best[i][0] + best[i + 1][0]) * (best[i][0] * best[i + 1][1] - best[i + 1][0] * best[i][1]) for i in range(len(best) - 1)) / (6 * a)
    cy = sum((best[i][1] + best[i + 1][1]) * (best[i][0] * best[i + 1][1] - best[i + 1][0] * best[i][1]) for i in range(len(best) - 1)) / (6 * a)
    return cx, cy


def inside(pt, geom):
    x, y = pt
    for p in polys(geom):
        c = False
        for ring in p:
            j = len(ring) - 1
            for i in range(len(ring)):
                xi, yi = ring[i][:2]; xj, yj = ring[j][:2]
                if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi:
                    c = not c
                j = i
        if c:
            return True
    return False


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        s, e = stack.pop()
        ax, ay = pts[s]; bx, by = pts[e]
        dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-12
        idx, dmax = -1, 0
        for i in range(s + 1, e):
            d = abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L
            if d > dmax:
                idx, dmax = i, d
        if dmax > tol:
            keep[idx] = True; stack += [(s, idx), (idx, e)]
    return [p for p, k in zip(pts, keep) if k]


LAT0 = math.cos(math.radians(9.0))


def proj(lon, lat):
    return lon * LAT0, -lat


def frame(geoms, width):
    xs, ys = [], []
    for g in geoms:
        for p in polys(g):
            for x, y in (proj(*c[:2]) for c in p[0]):
                xs.append(x); ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    s = width / (x1 - x0)
    return (x0, y0, s), [round(width), round((y1 - y0) * s)]


def path(geom, fr, tol, digits=1):
    x0, y0, s = fr
    out = []
    for p in polys(geom):
        for ring in p:
            pts = [((x - x0) * s, (y - y0) * s) for x, y in (proj(*c[:2]) for c in ring)]
            m = len(pts) // 2  # closed ring: simplify the two halves so the chord is never zero-length
            pts = dp(pts[: m + 1], tol)[:-1] + dp(pts[m:], tol)
            if len(pts) < 4:
                continue
            f = lambda v: (f"{v:.{digits}f}").rstrip("0").rstrip(".")
            out.append("M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts[:-1]) + "Z")
    return "".join(out)


def label_point(geom, fr):
    """[x, y, area] in the state frame: area-weighted centroid of the largest ring, and its area in px²."""
    x0, y0, sc = fr
    best = max((p[0] for p in polys(geom)), key=lambda r: abs(ring_area(r)))
    pts = [((x - x0) * sc, (y - y0) * sc) for x, y in (proj(*c[:2]) for c in best)]
    a = sum(pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1] for i in range(len(pts) - 1)) / 2 or 1e-9
    cx = sum((pts[i][0] + pts[i + 1][0]) * (pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]) for i in range(len(pts) - 1)) / (6 * a)
    cy = sum((pts[i][1] + pts[i + 1][1]) * (pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]) for i in range(len(pts) - 1)) / (6 * a)
    return [round(cx, 1), round(cy, 1), round(abs(a))]


# 1. States
states = {}
for f in ADM1["features"]:
    nm = ADM1_NAME.get(f["properties"]["shapeName"], f["properties"]["shapeName"])
    states[nm] = f["geometry"]
assert set(states) == set(TILES), set(states) ^ set(TILES)

# 2. Assign each LGA polygon to a state and match to an lgas.json id
by_state_name = {}
for l in LGAS:
    by_state_name.setdefault(l["state"], {})[norm(l["name"])] = l["id"]

ALIASES = json.load(open(HERE / "aliases.json", encoding="utf-8")) if (HERE / "aliases.json").exists() else {}
matched, unmatched = {}, []
for f in ADM2["features"]:
    g = f["geometry"]; c = centroid(g)
    st = next((s for s, sg in states.items() if inside(c, sg)), None)
    if st is None:  # coastal slivers: nearest state centroid
        st = min(states, key=lambda s: math.dist(c, centroid(states[s])))
    raw = f["properties"]["shapeName"]
    key = norm(ALIASES.get(f"{st}|{raw}", raw))
    lid = by_state_name[st].get(key)
    if lid is None:
        unmatched.append((st, raw))
    elif lid in matched:
        unmatched.append((st, raw + " (duplicate of " + lid + ")"))
    else:
        matched[lid] = (st, g)

missing = [(l["state"], l["name"]) for l in LGAS if l["id"] not in matched]
print("matched", len(matched), "unmatched", len(unmatched))
for u in unmatched: print("  geo  :", u)
for m in missing: print("  lgas :", m)
if "--check" in sys.argv:
    sys.exit(0)

# 3. Build output
out = {
    "source": "geoBoundaries gbOpen NGA ADM1/ADM2 (GRID3 Nigeria boundaries), simplified",
    "sourceUrl": "https://www.geoboundaries.org/countryDownloads.html",
    "licence": "CC BY 4.0",
    "states": {},
    "national": {},
}
nfr, nbox = frame(list(states.values()), 600)
out["national"] = {"box": nbox, "states": {TILES[s]: path(g, nfr, 0.9) for s, g in states.items()}}
for s, sg in states.items():
    lg = {lid: g for lid, (st, g) in matched.items() if st == s}
    fr, box = frame([sg], 400)
    out["states"][TILES[s]] = {
        "name": s,
        "box": box,
        "outline": path(sg, fr, 0.6),
        "lgas": {lid: path(g, fr, 0.6) for lid, g in lg.items()},
        "labels": {lid: label_point(g, fr) for lid, g in lg.items()},
    }
dst = REPO / "src/data/geo.json"
dst.parent.mkdir(exist_ok=True)
dst.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print("wrote", dst, round(dst.stat().st_size / 1024), "KB")
sizes = sorted(((len(json.dumps(v)), k) for k, v in out["states"].items()), reverse=True)[:5]
print("largest states (bytes):", sizes, "national:", len(json.dumps(out["national"])))
