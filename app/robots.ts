import type { MetadataRoute } from "next";

/*
 * Crawl rules only. Page-level noindex (city lists, firm profiles, policies, forms, admin)
 * stays on those pages and is not repeated here. Disallow is limited to the admin panel.
 * The sitemap line is omitted until SITE_URL is the public origin, with no trailing slash.
 */

function siteOrigin(): string | null {
  const raw = process.env.SITE_URL?.trim() ?? "";
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
