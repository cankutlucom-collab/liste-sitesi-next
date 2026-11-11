import type { Metadata } from "next";
import Script from "next/script";
import { SITE_TITLE } from "../../lib/cities";
import { escapeHtml } from "../../lib/listing";
import { sitePageHtml } from "../../lib/profile";
import { listServiceDirectory, servicePagePath } from "../../lib/service-directory";

/*
 * /hizmetler — directory of services with their city pages. Not linked from the menu or footer.
 * Built per request from published firms, so it follows firms going live or offline.
 */

export const dynamic = "force-dynamic";

const CITY_LIMIT = 6;

const CSS = `
<style>
.hz-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px }
.hz-card { aspect-ratio: 1 / 1; min-width: 0; overflow: hidden; box-sizing: border-box; background: #FFFFFF; border: 1px solid #BCC4F0; border-radius: 12px; display: flex; flex-direction: column; font-family: "IBM Plex Sans", sans-serif }
.hz-title { margin: 0; flex: none; box-sizing: border-box; min-height: 64px; display: flex; align-items: center; background: #000845; font-size: 18px; font-weight: 600; line-height: 1.25 }
.hz-title a { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; width: 100%; box-sizing: border-box; padding: 10px 16px; color: #FFFFFF; text-decoration: none; transition: color .15s ease }
.hz-title a span { text-decoration: underline; text-decoration-color: #FFFFFF; text-decoration-thickness: 1px; text-underline-offset: 2px; text-decoration-skip-ink: none }
.hz-title a:hover { color: #DDE2FF }
.hz-cities { list-style: none; margin: 0; padding: 0; flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column }
.hz-cities li { flex: 1 1 0; min-width: 0; display: flex; border-bottom: 1px solid #DDE2FF }
.hz-cities li:last-child { border-bottom: 0 }
.hz-cities a { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; box-sizing: border-box; padding: 4px 16px; color: #0013A3; text-decoration: none; font-size: 14px; line-height: 1.3; overflow-wrap: anywhere; transition: color .15s ease, background-color .15s ease }
.hz-cities a:hover { color: #0A1466; background: #DDE2FF }
.hz-more { flex: none; display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 16px; background: #000845; color: #FFFFFF; font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.2; text-decoration: none; text-align: center; transition: background-color .15s ease }
.hz-more:hover { background: #0A1466 }
.hz-title a:focus-visible, .hz-more:focus-visible { outline: 3px solid #DDE2FF; outline-offset: -5px }
.hz-cities a:focus-visible { outline: 3px solid #0013A3; outline-offset: -3px }
@media (max-width: 700px) { .hz-grid { grid-template-columns: minmax(0, 1fr) } }
@media (prefers-reduced-motion: reduce) { .hz-title a, .hz-cities a, .hz-more { transition: none !important } }
</style>`;

export async function generateMetadata(): Promise<Metadata> {
  const hasGroups = listServiceDirectory().length > 0;
  return {
    title: `Hizmetler | ${SITE_TITLE}`,
    description: "Hizmetler ve her hizmetin il sayfaları.",
    ...(hasGroups ? {} : { robots: { index: false } }),
  };
}

export default function Page() {
  const groups = listServiceDirectory();
  const body = groups.length
    ? `<ul class="hz-grid">
${groups.map((group) => `<li class="hz-card">
<h2 class="hz-title"><a href="${escapeHtml(group.path)}"><span>${escapeHtml(group.name)}</span></a></h2>
<ul class="hz-cities">
${group.cities.slice(0, CITY_LIMIT).map((city) => `<li><a href="${escapeHtml(city.path)}">${escapeHtml(city.label)}</a></li>`).join("\n")}
</ul>
${group.cities.length > CITY_LIMIT ? `<a class="hz-more" href="${escapeHtml(servicePagePath(group.slug))}">Daha fazla gör</a>` : ""}
</li>`).join("\n")}
</ul>`
    : `<p style="margin: 0; font-size: 16px; color: #1F2A44">Henüz listelenecek hizmet yok.</p>`;
  const main = `${CSS}
<main id="ana-icerik" style="max-width: 1000px; margin: 0 auto; padding: 36px 24px 72px; display: flex; flex-direction: column; gap: 20px">
<h1 style="margin: 0; font-size: clamp(26px, 5vw, 34px); line-height: 1.2; color: #0A1466">Su Arıtma Cihazı Firmaları ve Hizmet Kategorileri</h1>
${body}
</main>
`;
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: sitePageHtml(main) }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
