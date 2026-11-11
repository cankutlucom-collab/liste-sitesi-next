import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import home from "../../home.json";
import { applyBanners } from "../../../lib/banners";
import { CATEGORY_SLUG, CITY_DESCRIPTION_SUBJECT, CITY_PAGE_KEYWORD, DESIGN_DESCRIPTION_SUBJECT, DESIGN_PAGE_KEYWORD, setDesignH1, type City } from "../../../lib/cities";
import { getPageSeo, resolvePageTexts } from "../../../lib/category-store";
import { linkHomeDesignNavigation, visibleCityBySlug } from "../../../lib/city-store";
import { listPublishedFirmsInCategory, type Firm } from "../../../lib/firms";
import { buildCityListingHtml, withPageFaq } from "../../../lib/listing";
import { linkPolicyPages } from "../../../lib/policies";

/*
 * Shared city list page: /su-yumusatma-cihazi/ankara, /su-yumusatma-cihazi/istanbul …
 * (moved here from /firmalar/<city>; the old address is no longer served).
 * Same template, listing and rotation as before; only the city differs.
 * A city page exists only while the city is registered AND has at least one published firm in THIS
 * category: every other slug (unknown, deleted, or registered but without a firm in this category)
 * answers 404, so there is never an empty list page. Existing pages are therefore always indexable.
 *
 * Title, description and the FAQ come from this category+city page's texts (admin: /admin/kategoriler).
 * An empty title/description keeps the built-in default text; a city without FAQ entries keeps the
 * design's FAQ.
 */

const EMPTY_MESSAGE = "Bu şehirde henüz yayınlanmış firma yok.";

// Always read the current published rows from SQLite (and the current rotation slot).
export const dynamic = "force-dynamic";

type Params = Promise<{ city: string }>;

async function loadCity(params: Params): Promise<City> {
  const city = visibleCityBySlug((await params).city, CATEGORY_SLUG);
  if (!city) notFound();
  return city;
}

/**
 * The homepage design with the city in its headings (H1 = the page's tab title). Built per request: the footer city nav is dynamic.
 * The other headings keep the short "<Şehir> <Kategori>" form.
 */
function cityTemplate(city: City, h1: string): string {
  const title = city.name + " " + CITY_PAGE_KEYWORD;
  return setDesignH1(
    linkPolicyPages(linkHomeDesignNavigation(home, CATEGORY_SLUG, city.slug))
      .replaceAll(DESIGN_PAGE_KEYWORD, () => title)
      .replace("Şehrinizdeki " + title, () => title)
      .replace(DESIGN_DESCRIPTION_SUBJECT, () => CITY_DESCRIPTION_SUBJECT)
      // The homepage's "#ust" self-links (logo, "Ana Sayfa") must lead back to the homepage here,
      // and "Ana Sayfa" is not the current page (same treatment as lib/profile.ts).
      .replaceAll('href="#ust"', 'href="/"')
      .replace(' aria-current="page"', ""),
    h1,
  );
}

/** Published firms of the category in this city, each firm once: the list the page shows and the number in its title. */
function cityFirmCount(allPublished: Firm[], city: City): number {
  return new Set(allPublished.filter((firm) => firm.city === city.name).map((firm) => firm.id)).size;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = await loadCity(params);
  const count = cityFirmCount(listPublishedFirmsInCategory(CATEGORY_SLUG), city);
  const { title, description } = resolvePageTexts(CATEGORY_SLUG, city.slug, city.name, count);
  return { title, description };
}

export default async function CityPage({ params }: { params: Params }) {
  const city = await loadCity(params);
  const faqs = getPageSeo(CATEGORY_SLUG, city.slug)?.faqs ?? [];
  // All published rows: the city's Ekonomik cards follow the global Ekonomik rotation, filtered to the city.
  const allPublished = listPublishedFirmsInCategory(CATEGORY_SLUG);
  const { title } = resolvePageTexts(CATEGORY_SLUG, city.slug, city.name, cityFirmCount(allPublished, city));
  const cityContent = buildCityListingHtml(applyBanners(withPageFaq(cityTemplate(city, title), faqs)), allPublished, city.name, EMPTY_MESSAGE);
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: cityContent }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
