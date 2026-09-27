import { NextResponse } from "next/server";
import { LANG_COOKIE, isUiLang } from "@/lib/i18n";

/** GET /api/lang?set=ha&back=/obio-akpor  → remembers the interface language and returns to the page. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const set = url.searchParams.get("set") ?? "en";
  const back = url.searchParams.get("back") ?? "/";
  // Only same-site paths are accepted as the return destination.
  const dest = /^\/[A-Za-z0-9\-_/?=&#%.]*$/.test(back) && !back.startsWith("//") ? back : "/";
  const res = NextResponse.redirect(new URL(dest, url.origin), 303);
  if (isUiLang(set)) res.cookies.set(LANG_COOKIE, set, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
