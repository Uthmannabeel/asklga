import type { MetadataRoute } from "next";
import lgas from "@/db/lgas.json";
import { TILES, stateSlug } from "@/lib/ngTiles";
import { SITE_URL } from "@/lib/site";

/** Every national page, all 37 state pages, and every LGA's page and money ledger. */
export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${SITE_URL}${p}`;
  const national = ["/", "/money", "/compare", "/issues", "/report-cards", "/about", "/about-answers", "/scoreboard", "/insights", "/standard", "/join", "/privacy"];
  return [
    ...national.map((p) => ({ url: u(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...TILES.map((t) => ({ url: u(`/state/${stateSlug(t.state)}`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...(lgas as { id: string }[]).flatMap((l) => [
      { url: u(`/${l.id}`), changeFrequency: "weekly" as const, priority: 0.8 },
      { url: u(`/${l.id}/money`), changeFrequency: "monthly" as const, priority: 0.5 },
      { url: u(`/${l.id}/issues`), changeFrequency: "daily" as const, priority: 0.5 },
    ]),
  ];
}
