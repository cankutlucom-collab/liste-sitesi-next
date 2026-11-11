import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { SITE_TITLE } from "../../../lib/cities";
import { escapeHtml } from "../../../lib/listing";
import { sitePageHtml } from "../../../lib/profile";
import { getServiceGroup, SERVICES_PATH } from "../../../lib/service-directory";

/*
 * /hizmetler/<hizmet-slug> — every published city page of one service, in Turkish order, no limit.
 * Unknown, reserved or firm-less slugs answer 404. City links stay /<hizmet-slug>/<sehir-slug>.
 */

export const dynamic = "force-dynamic";

type Params = Promise<{ service: string }>;

async function load(params: Params) {
  const { service } = await params;
  const group = getServiceGroup(service);
  if (!group) notFound();
  return group;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const group = await load(params);
  return {
    title: `${group.name} İlleri | ${SITE_TITLE}`,
    description: `${group.name} hizmetinin yayındaki il sayfaları.`,
  };
}

export default async function Page({ params }: { params: Params }) {
  const group = await load(params);
  const main = `<style>
.hz-panel { border: 1px solid #BCC4F0; border-radius: 12px; overflow: hidden; background: #FFFFFF; font-family: "IBM Plex Sans", sans-serif }
.hz-panel-head { margin: 0; padding: 18px 20px; background: #000845; color: #FFFFFF; font-size: clamp(22px, 4vw, 30px); font-weight: 600; line-height: 1.2; overflow-wrap: anywhere }
.hz-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) }
.hz-list li { min-width: 0; border-bottom: 1px solid #DDE2FF }
.hz-list a { display: block; box-sizing: border-box; padding: 10px 20px; color: #0013A3; text-decoration: none; font-size: 15px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .15s ease, background-color .15s ease }
.hz-list a:hover { color: #0A1466; background: #DDE2FF }
.hz-list a:focus-visible, .hz-back:focus-visible { outline: 3px solid #0013A3; outline-offset: -3px }
.hz-back { display: inline-block; padding: 10px 0; color: #0A1466; font-weight: 600; text-decoration: underline; text-underline-offset: 3px }
.hz-back:hover { color: #0013A3 }
@media (max-width: 700px) { .hz-list { grid-template-columns: minmax(0, 1fr) } }
@media (prefers-reduced-motion: reduce) { .hz-list a { transition: none !important } }
</style>
<main id="ana-icerik" style="max-width: 1000px; margin: 0 auto; padding: 36px 24px 72px; display: flex; flex-direction: column; gap: 20px">
<section class="hz-panel">
<h1 class="hz-panel-head">${escapeHtml(group.name)}</h1>
<ul class="hz-list">
${group.cities.map((city) => `<li><a href="${escapeHtml(city.path)}">${escapeHtml(city.label)}</a></li>`).join("\n")}
</ul>
</section>
<p style="margin: 0"><a class="hz-back" href="${SERVICES_PATH}">Tüm hizmetler</a></p>
</main>
`;
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: sitePageHtml(main) }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
