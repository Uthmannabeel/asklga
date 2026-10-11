import pdfplumber, glob, os, sys, json
res = {}
for f in sorted(glob.glob("*.pdf")):
    try:
        p = pdfplumber.open(f)
        pages = []
        for i, pg in enumerate(p.pages):
            t = pg.extract_text() or ""
            if "ABA NORTH" in t or "ABA SOUTH" in t: pages.append(i)
        res[f] = {"pages": len(p.pages), "lgaPages": pages}
        print(f, len(p.pages), pages, flush=True)
    except Exception as e:
        print(f, "ERR", e); res[f] = {"error": str(e)}
json.dump(res, open("../../work_pdf_scan.json", "w"), indent=1)
