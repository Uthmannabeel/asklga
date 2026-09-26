/**
 * Minimal package fetcher for machines where `npm install` stalls behind a slow,
 * intercepting proxy. Resolves a package@range from the registry, downloads the
 * tarball, extracts it into node_modules, and recurses into non-optional dependencies.
 * No lockfile, no scripts, no dedupe: good enough to run a dev server.
 *
 * Usage: node --use-system-ca scripts/fetch-pkg.mjs zod@^4 leaflet@1.9.4 ...
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pipeline } from "node:stream/promises";

const NM = path.join(process.cwd(), "node_modules");
const REGISTRY = "https://registry.npmjs.org";
const done = new Set();

function parseVer(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null } : null;
}
function cmp(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}
function pick(versions, range) {
  const all = versions.map((v) => ({ v, p: parseVer(v) })).filter((x) => x.p && !x.p.pre).sort((a, b) => cmp(a.p, b.p));
  range = range.trim();
  if (range === "" || range === "*" || range === "latest") return all.at(-1)?.v;
  const first = range.split(/\s*\|\|\s*/)[0].split(/\s+/)[0];
  const exact = parseVer(first.replace(/^[=v]/, ""));
  if (exact && /^[=v]?\d/.test(first)) return versions.includes(first.replace(/^[=v]/, "")) ? first.replace(/^[=v]/, "") : all.filter((x) => x.p.major === exact.major).at(-1)?.v;
  const m = first.match(/^([\^~>]=?)?v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?/);
  if (!m) return all.at(-1)?.v;
  const op = m[1] ?? "^";
  const major = +m[2];
  const minor = m[3] && /\d/.test(m[3]) ? +m[3] : 0;
  const patch = m[4] && /\d/.test(m[4]) ? +m[4] : 0;
  const min = { major, minor, patch };
  let cands = all.filter((x) => cmp(x.p, min) >= 0);
  if (op === "^") cands = cands.filter((x) => (major > 0 ? x.p.major === major : x.p.major === 0 && x.p.minor === minor));
  else if (op === "~") cands = cands.filter((x) => x.p.major === major && x.p.minor === minor);
  return cands.at(-1)?.v ?? all.at(-1)?.v;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/vnd.npm.install-v1+json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function install(spec, depth = 0) {
  const at = spec.lastIndexOf("@");
  const name = at > 0 ? spec.slice(0, at) : spec;
  const range = at > 0 ? spec.slice(at + 1) : "latest";
  const dest = path.join(NM, name);
  if (done.has(name)) return;
  done.add(name);
  if (fs.existsSync(path.join(dest, "package.json"))) {
    const have = JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8")).version;
    console.log(`${"  ".repeat(depth)}have ${name}@${have}`);
    return;
  }
  const meta = await fetchJson(`${REGISTRY}/${name.replace("/", "%2f")}`);
  const version = range === "latest" ? meta["dist-tags"].latest : pick(Object.keys(meta.versions), range);
  const v = meta.versions[version];
  if (!v) throw new Error(`no version for ${name}@${range}`);
  const tmp = path.join(NM, ".tmp-" + name.replace("/", "__") + ".tgz");
  fs.mkdirSync(NM, { recursive: true });
  const started = Date.now();
  const res = await fetch(v.dist.tarball);
  if (!res.ok || !res.body) throw new Error(`tarball ${res.status} ${name}`);
  await pipeline(res.body, fs.createWriteStream(tmp));
  fs.mkdirSync(dest, { recursive: true });
  execFileSync("tar", ["-xzf", tmp, "-C", dest, "--strip-components=1"], { stdio: "ignore" });
  fs.unlinkSync(tmp);
  console.log(`${"  ".repeat(depth)}got  ${name}@${version} (${Math.round((Date.now() - started) / 1000)}s)`);
  const deps = { ...(v.dependencies ?? {}) };
  for (const [d, r] of Object.entries(deps)) {
    if (v.optionalDependencies?.[d]) continue;
    await install(`${d}@${r}`, depth + 1);
  }
}

for (const spec of process.argv.slice(2)) {
  await install(spec);
}
console.log("FETCH-DONE");
