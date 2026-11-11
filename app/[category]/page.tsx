import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import home from "../home.json";
import { applyBanners } from "../../lib/banners";
import { getCategoryName, getPageSeo, isReservedSlug, resolvePageTexts } from "../../lib/category-store";
import { linkHomeDesignNavigation } from "../../lib/city-store";
import {
  CITY_DESCRIPTION_SUBJECT, DESIGN_DESCRIPTION_SUBJECT, DESIGN_PAGE_KEYWORD, categoryDescriptionSubject, setDesignH1,
} from "../../lib/cities";
import { listPublishedFirmsInCategory, type Firm } from "../../lib/firms";
import { buildHomeListingHtml, withPageFaq } from "../../lib/listing";
import { linkPolicyPages } from "../../lib/policies";

/*
 * Public page of a panel-added category: /<kategori-slug>. Same card-listing template, rotation and
 * package rule as /su-yumusatma-cihazi (which keeps its own route and wins over this one).
 * The page exists only for a registered category that is not a reserved address and has at least one
 * published firm; everything else answers 404.
 */

export const dynamic = "force-dynamic";

type Params = Promise<{ category: string }>;

async function load(params: Params): Promise<{ slug: string; name: string; firms: Firm[] }> {
  const slug = (await params).category;
  const name = isReservedSlug(slug) ? null : getCategoryName(slug);
  if (!name) notFound();
  const seen = new Set<number>();
  const firms = listPublishedFirmsInCategory(slug).filter((firm) => !seen.has(firm.id) && !!seen.add(firm.id));
  if (!firms.length) notFound();
  return { slug, name, firms };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, firms } = await load(params);
  const { title, description } = resolvePageTexts(slug, "", "", firms.length);
  return { title, description };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug, name, firms } = await load(params);
  const { title } = resolvePageTexts(slug, "", "", firms.length);
  const faqs = getPageSeo(slug, "")?.faqs ?? [];
  const page = setDesignH1(
    applyBanners(withPageFaq(linkPolicyPages(linkHomeDesignNavigation(home, slug)), faqs))
      .replaceAll(DESIGN_PAGE_KEYWORD, () => name)
      .replace(DESIGN_DESCRIPTION_SUBJECT, () => categoryDescriptionSubject(name))
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
