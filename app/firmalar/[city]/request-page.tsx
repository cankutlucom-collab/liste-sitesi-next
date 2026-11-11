import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { getPublishedFirmBySlug, type Firm } from "../../../lib/firms";
import type { RequestType } from "../../../lib/firm-requests";
import { buildRequestPageHtml, REQUEST_PAGE_TITLES } from "../../../lib/request-pages";

/*
 * Shared implementation of /firmalar/<firma-adi>/sahiplen and /firmalar/<firma-adi>/kaldir (not a route
 * itself: only page.tsx/route.ts files are routes). Same 404 rule as the profile page.
 */

export type Params = Promise<{ city: string }>;
export type SearchParams = Promise<{ sonuc?: string }>;

async function loadFirm(params: Params): Promise<Firm> {
  const firm = getPublishedFirmBySlug((await params).city);
  if (!firm) notFound();
  return firm;
}

export async function requestMetadata(params: Params, type: RequestType): Promise<Metadata> {
  const firm = await loadFirm(params);
  return {
    title: `${REQUEST_PAGE_TITLES[type]} – ${firm.name} | Su Arıtma Cihazı Firmaları`,
    // Form pages are never indexed (same as the profile pages for now).
    robots: { index: false, follow: false },
  };
}

export async function RequestPage({ params, searchParams, type }: { params: Params; searchParams: SearchParams; type: RequestType }) {
  const firm = await loadFirm(params);
  const { sonuc } = await searchParams;
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: buildRequestPageHtml(firm, type, sonuc) }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
