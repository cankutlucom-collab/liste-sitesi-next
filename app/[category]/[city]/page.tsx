import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import home from "../../home.json";
import { applyBanners } from "../../../lib/banners";
import {
  DESIGN_DESCRIPTION_SUBJECT, DESIGN_PAGE_KEYWORD, categoryDescriptionSubject, setDesignH1, type City,
} from "../../../lib/cities";
import { getCategoryName, getPageSeo, isReservedSlug, resolvePageTexts } from "../../../lib/category-store";
import { linkHomeDesignNavigation, visibleCityBySlug } from "../../../lib/city-store";
import { listPublishedFirmsInCategory, type Firm } from "../../../lib/firms";
import { buildCityListingHtml, withPageFaq } from "../../../lib/listing";
import { linkPolicyPages } from "../../../lib/policies";

/*
 * Public city page of a panel-added category: /<kategori-slug>/<sehir-slug>. Same template, rotation and
 * package rule as /su-yumusatma-cihazi/<sehir>. It exists only for a registered, non-reserved category
 * and a registered city with at least one published firm in THIS category; everything else answers 404.
 */

const EMPTY_MESSAGE = "Bu şehirde henüz yayınlanmış firma yok.";

export const dynamic = "force-dynamic";

type Params = Promise<{ category: string; city: string }>;

async function load(params: Params): Promise<{ slug: string; name: string; city: City }> {
  const { category: slug, city: citySlug } = await params;
  const name = isReservedSlug(slug) ? null : getCategoryName(slug);
  if (!name) notFound();
  const city = visibleCityBySlug(citySlug, slug);
  if (!city) notFound();
  return { slug, name, city };
}

function cityFirmCount(allPublished: Firm[], city: City): number {
  return new Set(allPublished.filter((firm) => firm.city === city.name).map((firm) => firm.id)).size;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, city } = await load(params);
  const count = cityFirmCount(listPublishedFirmsInCategory(slug), city);
  const { title, description } = resolvePageTexts(slug, city.slug, city.name, count);
  return { title, description };
}

export default async function CategoryCityPage({ params }: { params: Params }) {
  const { slug, name, city } = await load(params);
  const faqs = getPageSeo(slug, city.slug)?.faqs ?? [];
  const allPublished = listPublishedFirmsInCategory(slug);
  const { title } = resolvePageTexts(slug, city.slug, city.name, cityFirmCount(allPublished, city));
  const heading = city.name + " " + name;
  const template = setDesignH1(
    linkPolicyPages(linkHomeDesignNavigation(home, slug))
      .replaceAll(DESIGN_PAGE_KEYWORD, () => heading)
      .replace("Şehrinizdeki " + heading, () => heading)
      .replace(DESIGN_DESCRIPTION_SUBJECT, () => categoryDescriptionSubject(name))
      .replaceAll('href="#ust"', 'href="/"')
      .replace(' aria-current="page"', ""),
    title,
  );
  const content = buildCityListingHtml(applyBanners(withPageFaq(template, faqs)), allPublished, city.name, EMPTY_MESSAGE);
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: content }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
