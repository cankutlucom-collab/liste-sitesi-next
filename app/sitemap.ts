import type { MetadataRoute } from "next";
import { listPosts } from "../lib/blog";
import { CATEGORY_PATH, CATEGORY_SLUG, cityPagePath } from "../lib/cities";
import { listVisibleCities } from "../lib/city-store";
import { listServiceDirectory, servicePagePath, SERVICES_PATH } from "../lib/service-directory";
import { firmProfilePath, listAllPublishedFirms, listPublishedFirmsInCategory } from "../lib/firms";

/*
 * Only URLs that are allowed to be indexed. Empty city pages, policy pages, request forms,
 * /admin and the /firma-profili design preview stay noindex and are left out.
 * A city is listed only when it has a published firm in the category (otherwise the page is 404, not just noindex). Blog posts are /blog/<slug>.
 * Without SITE_URL there is no public origin, so the map is empty rather than localhost.
 */

export const dynamic = "force-dynamic";

function siteOrigin(): string | null {
  const raw = process.env.SITE_URL?.trim() ?? "";
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];

  const firms = listAllPublishedFirms();
  // The category page exists (is not 404) only while the category has a published firm.
  const hasCategoryFirms = listPublishedFirmsInCategory(CATEGORY_SLUG).length > 0;
  const pages: MetadataRoute.Sitemap = ["/", ...(hasCategoryFirms ? [CATEGORY_PATH] : []), "/iletisim", "/blog"].map((path) => ({
    url: origin + path,
  }));

  const services = listServiceDirectory();
  if (services.length > 0) pages.push({ url: origin + SERVICES_PATH });
  for (const service of services) pages.push({ url: origin + servicePagePath(service.slug) });

  // Cities with at least one published firm in this category; the same rule that makes /su-yumusatma-cihazi/<slug> exist.
  for (const city of listVisibleCities(CATEGORY_SLUG)) pages.push({ url: origin + cityPagePath(city.slug) });
  for (const firm of firms) pages.push({ url: origin + firmProfilePath(firm) });
  for (const post of listPosts()) {
    pages.push({ url: `${origin}/blog/${post.slug}`, lastModified: post.updated });
  }

  return pages;
}
