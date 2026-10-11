"""Shared LGA name -> lgas.json id matcher (state-scoped)."""
import json, re, os

LGAS_PATH = os.environ.get("LGAS_JSON") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "db", "lgas.json")
LGAS = json.load(open(LGAS_PATH, encoding="utf-8"))
ALIAS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aliases.json")
ALIASES = json.load(open(ALIAS_PATH, encoding="utf-8")) if os.path.exists(ALIAS_PATH) else {}

STATE_FIX = {"FCT": "Federal Capital Territory", "FCT ABUJA": "Federal Capital Territory",
             "ABUJA": "Federal Capital Territory", "FEDERAL CAPITAL TERRITORY": "Federal Capital Territory",
             "NASSARAWA": "Nasarawa", "AKWA-IBOM": "Akwa Ibom", "CROSS-RIVER": "Cross River",
             "CROSSRIVER": "Cross River", "AKWAIBOM": "Akwa Ibom"}


def norm(s):
    s = str(s).upper().replace("&", " AND ")
    s = re.sub(r"\(.*?\)", " ", s)
    return re.sub(r"[^A-Z0-9]", "", s)


def norm_keep_paren(s):
    return re.sub(r"[^A-Z0-9]", "", str(s).upper().replace("&", "AND"))


STATES = {norm(x["state"]): x["state"] for x in LGAS}


def canon_state(s):
    if s is None:
        return None
    u = re.sub(r"\s+", " ", str(s).strip().upper())
    u = re.sub(r"\s*(STATE|LGCS?|TOTAL)$", "", u).strip()
    for k, v in STATE_FIX.items():
        if norm(k) == norm(u):
            return v
    if norm(u) in ("FCTABUJA", "FCT", "ABUJAFCT"):
        return "Federal Capital Territory"
    n = norm(u)
    if n in STATES:
        return STATES[n]
    if norm(u.replace(" ", "")) in STATES:
        return STATES[norm(u)]
    return None


BY_STATE = {}
for x in LGAS:
    d = BY_STATE.setdefault(x["state"], {})
    d[norm(x["name"])] = x["id"]
    d[norm_keep_paren(x["name"])] = x["id"]


def match(state, name):
    """Return lgas.json id or None."""
    if state is None or name is None:
        return None
    key = f"{state}|{norm_keep_paren(name)}"
    if key in ALIASES:
        return ALIASES[key]
    d = BY_STATE.get(state, {})
    for k in (norm_keep_paren(name), norm(name)):
        if k in d:
            return d[k]
    return None
