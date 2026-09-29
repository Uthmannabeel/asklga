import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/api/catalogue.json"], disallow: ["/admin", "/api/", "/*/embed"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
