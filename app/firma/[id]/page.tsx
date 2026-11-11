import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { getPublishedFirmByParam, type Firm } from "../../../lib/firms";
import { buildProfileHtml } from "../../../lib/profile";

// Always read the current row: unpublishing must take the profile down on the next request.
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

/**
 * Published firms only. Drafts, unknown ids and non-canonical ids ("012", "1abc") all answer 404.
 * This is the temporary safe behaviour; no archive/redirect policy is applied yet.
 */
async function loadFirm(params: Params): Promise<Firm> {
  const firm = getPublishedFirmByParam((await params).id);
  if (!firm) notFound();
  return firm;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const firm = await loadFirm(params);
  return {
    title: `${firm.name} | Endüstriyel Su Arıtma`,
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
