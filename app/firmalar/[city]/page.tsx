import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { getPublishedFirmBySlug, type Firm } from "../../../lib/firms";
import { buildProfileHtml } from "../../../lib/profile";

/*
 * Public firm profile: /firmalar/<firma-adi>.
 * The folder is still called [city] (left over from the retired /firmalar/<city> stub; folders cannot be
 * renamed without a shell). The segment is the firm slug. Rename the folder to [slug] when convenient.
 */

// Always read the current row: unpublishing must take the profile down on the next request.
export const dynamic = "force-dynamic";

export type Params = Promise<{ city: string }>;

/**
 * Published firms only. Drafts and unknown or non-canonical slugs (including "ankara" when no firm
 * has that name) all answer 404. No archive/redirect policy is applied.
 */
async function loadFirm(params: Params): Promise<Firm> {
  const firm = getPublishedFirmBySlug((await params).city);
  if (!firm) notFound();
  return firm;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const firm = await loadFirm(params);
  return {
    title: `${firm.name} | Su Arıtma Cihazı Firmaları`,
    description: firm.shortDescription || `${firm.name} – ${firm.city} endüstriyel su arıtma firması iletişim bilgileri.`,
  };
}

export default async function FirmProfilePage({ params }: { params: Params }) {
  const firm = await loadFirm(params);
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: buildProfileHtml(firm) }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
