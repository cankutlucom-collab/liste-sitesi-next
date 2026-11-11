import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import home from "../home.json";
import { applyBanners } from "../../lib/banners";
import { getPageSeo, resolvePageTexts } from "../../lib/category-store";
import { linkHomeDesignNavigation } from "../../lib/city-store";
import {
  CATEGORY_SLUG, CITY_DESCRIPTION_SUBJECT, CITY_PAGE_KEYWORD, DESIGN_DESCRIPTION_SUBJECT, DESIGN_PAGE_KEYWORD,
  setDesignH1,
} from "../../lib/cities";
import { listPublishedFirmsInCategory, type Firm } from "../../lib/firms";
import { buildHomeListingHtml, withPageFaq } from "../../lib/listing";
import { linkPolicyPages } from "../../lib/policies";

/*
 * Category page: /su-yumusatma-cihazi. It uses the card-listing template (app/home.json, the same
 * design and listing/rotation code as the homepage and the city pages), not the old Şehirler template.
 * It lists the published firms of all cities; each city has its own page under /su-yumusatma-cihazi/<city>.
 * With no published firm in the category the page does not exist (404), like an empty city page.
 *
 * Tab title and H1 are the same text: "<Kategori Adı>: <n> Firma: <Site Adı>", n = unique published firms listed here.
 */

// Read the current published rows (and the current rotation slot) per request.
export const dynamic = "force-dynamic";

/** The firms this page lists: published, in the category, each firm once. */
function categoryFirms(): Firm[] {
  const seen = new Set<number>();
  return listPublishedFirmsInCategory(CATEGORY_SLUG).filter((firm) => !seen.has(firm.id) && !!seen.add(firm.id));
}

/** Title/description/FAQ come from the category's page texts (admin: /admin/kategoriler); empty = built-in pattern. */
export async function generateMetadata(): Promise<Metadata> {
  const firms = categoryFirms();
  if (!firms.length) notFound();
  const { title, description } = resolvePageTexts(CATEGORY_SLUG, "", "", firms.length);
  return { title, description };
}

export default function Page() {
  const firms = categoryFirms();
  if (!firms.length) notFound();
  const { title } = resolvePageTexts(CATEGORY_SLUG, "", "", firms.length);
  const faqs = getPageSeo(CATEGORY_SLUG, "")?.faqs ?? [];
  // Same treatment as the city pages: the homepage's "#ust" self-links lead back to "/", and "Ana Sayfa" is not the current page.
  const page = setDesignH1(
    applyBanners(withPageFaq(linkPolicyPages(linkHomeDesignNavigation(home, CATEGORY_SLUG)), faqs))
      .replaceAll(DESIGN_PAGE_KEYWORD, () => CITY_PAGE_KEYWORD)
      .replace(DESIGN_DESCRIPTION_SUBJECT, () => CITY_DESCRIPTION_SUBJECT)
      .replaceAll('href="#ust"', 'href="/"')
      .replace(' aria-current="page"', ""),
    title,
  );
  const content = buildHomeListingHtml(page, firms, "Bu kategoride henüz yayınlanmış firma yok.");
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: content }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
