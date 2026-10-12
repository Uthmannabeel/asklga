"""
Usage: python scripts/geo/build_national.py  (after the boundary downloads described in build_geo.py)

Writes public/geo/nigeria-lgas.json: all 774 LGA outlines and the 37 state outlines in one national
frame, for the national map. It is a static file so the server bundle does not grow; the page
fetches it once and the browser caches it.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
# Reuse build_geo.py up to its --check exit: projection, simplification and the LGA name matching.
src = (HERE / "build_geo.py").read_text(encoding="utf-8").split('if "--check" in sys.argv:')[0]
ns = {"__file__": str(HERE / "build_geo.py"), "__name__": "build_geo"}
exec(compile(src, "build_geo.py", "exec"), ns)

states, matched, frame, path, TILES = ns["states"], ns["matched"], ns["frame"], ns["path"], ns["TILES"]
fr, box = frame(list(states.values()), 600)
out = {
    "source": "geoBoundaries gbOpen NGA ADM1/ADM2 (GRID3 Nigeria boundaries), simplified",
    "licence": "CC BY 4.0",
    "box": box,
    "states": {TILES[s]: path(sg, fr, 0.8) for s, sg in states.items()},
    "lgas": {lid: path(geom, fr, 0.6) for lid, (st, geom) in sorted(matched.items())},
}
dst = ns["REPO"] / "public/geo/nigeria-lgas.json"
dst.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print("wrote", dst, round(dst.stat().st_size / 1024), "KB,", len(out["lgas"]), "LGAs")
