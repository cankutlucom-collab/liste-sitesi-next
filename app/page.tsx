import type { Metadata } from "next";
import Script from "next/script";
import home from "./home.json";
import { applyBanners } from "../lib/banners";
import { homeDescription, homeTitle, setDesignH1, setDesignIntro } from "../lib/cities";
import { linkHomeDesignNavigation } from "../lib/city-store";
import { listAllPublishedFirms, type Firm } from "../lib/firms";
import { buildHomeListingHtml } from "../lib/listing";
import { linkPolicyPages } from "../lib/policies";

/*
 * Homepage. Tab title and H1 are the same text: "Su Arıtma Cihazı Firmaları: (<n> İlden Firmalar)", where n is
 * the number of different cities that have at least one published firm (live, per request).
 */

// Always read the current published rows from SQLite (and the current rotation slot);
// the design's demo firms are never shown.
export const dynamic = "force-dynamic";

function cityCount(firms: Firm[]): number {
  return new Set(firms.map((firm) => firm.city.trim()).filter(Boolean)).size;
}

export async function generateMetadata(): Promise<Metadata> {
  const count = cityCount(listAllPublishedFirms());
  return { title: homeTitle(count), description: homeDescription(count) };
}

export default function Home() {
  const firms = listAllPublishedFirms();
  // Footer "Şehirler" links: only cities with a published firm; "Yasal" links lead to the approved policy pages.
  const count = cityCount(firms);
  // H1 = tab title; the visible intro sentence = tab description (app/home.json itself stays untouched).
  const page = setDesignIntro(
    setDesignH1(applyBanners(linkPolicyPages(linkHomeDesignNavigation(home))), homeTitle(count)),
    homeDescription(count),
  );
  const content = buildHomeListingHtml(page, firms, "Rehberde henüz yayınlanmış firma yok.");
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: content }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
