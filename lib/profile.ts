import home from "../app/home.json";
import { linkCategoryIndex } from "./cities";
import { getCategoryName, isReservedSlug } from "./category-store";
import { linkHomeDesignNavigation, visibleCityPath } from "./city-store";
import { listFirmCategories, phoneDigits, type Firm } from "./firms";
import { firmRequestPath } from "./firm-requests";
import { escapeHtml, firmLogoImage, logoLines, telHref } from "./listing";
import { linkPolicyPages } from "./policies";

/*
 * Public firm profile page, rendered from one published SQLite row.
 *
 * Site chrome (header, footer, pending dialog) comes from the approved homepage design
 * (app/home.json) so the profile looks like the rest of the public site. The body follows the
 * firm profile design (app/firma-profili/design.json) as a visual reference only: it shows the
 * fields the record actually has. Demo-only parts of that design are deliberately left out —
 * "Firma Hakkında"/services text, "Hizmet Verdiği İller", district, the map preview / Google Maps
 * link and the offer form — because the data model has no verified values for them.
 */

const headerEnd = home.indexOf("</header>");
const footerStart = home.indexOf('<footer class="s104">');
if (headerEnd < 0 || footerStart < 0 || footerStart < headerEnd) {
  // Fail loudly instead of rendering a page without navigation if the template changes.
  throw new Error("Header/footer not found in app/home.json");
}

// On the profile page the homepage's "#ust" self-links point back to the homepage instead.
const toHome = (html: string) => html.replaceAll('href="#ust"', 'href="/"');
const CHROME_TOP = linkCategoryIndex(toHome(home.slice(0, headerEnd + "</header>".length))).replace(' aria-current="page"', "");
const FOOTER = toHome(home.slice(footerStart));

/**
 * Any public page body (policy pages, profile request forms) inside the homepage header/footer.
 * The footer "Şehirler" nav lists only cities with a published firm, so it is built per call
 * (pages that are prerendered are refreshed by revalidatePath("/", "layout") in the admin actions).
 */
export function sitePageHtml(main: string): string {
  return CHROME_TOP + "\n" + main + "\n" + linkPolicyPages(linkHomeDesignNavigation(FOOTER));
}

/* ---------- shared inline styles (values from the firm profile design) ---------- */

const BRAND_GRADIENT =
  "radial-gradient(ellipse 70% 90% at 85% 0%, rgba(255, 255, 255, 0.16), transparent 60%), linear-gradient(160deg, #01030F 0%, #000845 45%, #0013A3 100%)";
export const CARD = "background: #FFFFFF; border: 1px solid #DCE3EC; border-radius: 12px; padding: 28px; display: flex; flex-direction: column; gap: 14px";
export const H2 = "margin: 0; font-size: 21px; line-height: 1.3; color: #0A1466";
export const BUTTON = "display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #BCC4F0; background: #FFFFFF; color: #0A1466; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600; font-size: 15px";
export const BUTTON_PRIMARY =`display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: ${BRAND_GRADIENT}; color: #FFFFFF; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 15px`;
const EXTERNAL = ' target="_blank" rel="noopener nofollow"';

const icon = (paths: string, size = 20, stroke = "#0013A3") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICON_PHONE = '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"></path>';
const ICON_WHATSAPP = '<path d="M3 20l1.3-3.9A8 8 0 1 1 7.9 19.7L3 20"></path><path d="M9 10h6M9 13h4"></path>';
const ICON_MAIL = '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path>';
const ICON_WEB = '<circle cx="12" cy="12" r="9"></circle><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>';
const ICON_PIN = '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle>';

/* ---------- pieces ---------- */

/** Same lettered logo the listing cards show (no uploaded logos exist yet). */
function logo(firm: Firm): string {
  const officialLogo = firmLogoImage(firm, 120);
  if (officialLogo) return officialLogo;
  const [top, bottom] = logoLines(firm.name).map(escapeHtml);
  return `<svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(firm.name)} logosu">` +
    '<circle cx="60" cy="44" r="30" fill="#E3F4F1"></circle><path d="M60 20s16 17 16 29a16 16 0 0 1-32 0c0-12 16-29 16-29z" fill="#0E8C7A"></path>' +
    '<path d="M47 52c5 3 9 3 13 0s8-3 13 0" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"></path>' +
    `<text x="60" y="94" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="17" font-weight="700" fill="#0B3B36" letter-spacing="1">${top}</text>` +
    `<text x="60" y="108" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="8.5" font-weight="600" fill="#0E8C7A" letter-spacing="1.5">${bottom}</text></svg>`;
}

/** City breadcrumb: links to the city's list page while it exists for the category; otherwise plain text. */
function cityCrumb(city: string): string {
  const path = visibleCityPath(city);
  return path
    ? `<a href="${escapeHtml(path)}" style="color: #0013A3; text-decoration: none">${escapeHtml(city)}</a>`
    : `<span>${escapeHtml(city)}</span>`;
}

/**
 * Links to the public page of each of the firm's categories (/<kategori-slug>, text = the category name).
 * The profile is only shown for a published firm, so each of its categories has at least one published
 * firm and its page exists. Unknown category slugs are skipped. No categories = nothing is rendered.
 */
function categoryLinks(firm: Firm): string {
  const links = listFirmCategories(firm.id)
    .map((slug) => ({ slug, name: getCategoryName(slug) }))
    .filter((category): category is { slug: string; name: string } => !!category.name && !isReservedSlug(category.slug))
    .map(({ slug, name }) => `<a href="/${escapeHtml(slug)}" style="color: #0013A3; text-decoration: none; font-weight: 600">${escapeHtml(name)}</a>`);
  if (!links.length) return "";
  return `<span style="font-size: 15px; color: #3E4F63">${links.join(", ")}</span>`;
}

function websiteLabel(website: string): string {
  try {
    const url = new URL(website);
    const path = url.pathname === "/" ? "" : url.pathname;
    return url.hostname + path;
  } catch {
    return website;
  }
}

function whatsappHref(firm: Firm): string {
  return "https://wa.me/" + phoneDigits(firm.whatsapp);
}

function contactItem(iconPaths: string, label: string, valueHtml: string): string {
  return `<li style="display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-top: 1px solid #EEF0F6">
<span style="width: 38px; height: 38px; flex: none; border-radius: 10px; background: #E8EBFF; display: flex; align-items: center; justify-content: center">${icon(iconPaths, 19)}</span>
<span style="display: flex; flex-direction: column; min-width: 0"><span style="font-size: 13px; color: #5A6B80">${label}</span>${valueHtml}</span>
</li>`;
}

const VALUE = "font-size: 16px; font-weight: 600; color: #0A1466; text-decoration: none; overflow-wrap: anywhere";
const valueLink = (href: string, text: string, external = false) =>
  `<a href="${escapeHtml(href)}"${external ? EXTERNAL : ""} style="${VALUE}">${escapeHtml(text)}</a>`;

function contactList(firm: Firm): string {
  const items = [contactItem(ICON_PHONE, "Telefon", valueLink(telHref(firm.phone), firm.phone))];
  if (firm.whatsapp) items.push(contactItem(ICON_WHATSAPP, "WhatsApp", valueLink(whatsappHref(firm), firm.whatsapp, true)));
  items.push(contactItem(ICON_MAIL, "E-posta", valueLink("mailto:" + firm.email, firm.email)));
  if (firm.website) items.push(contactItem(ICON_WEB, "Web sitesi", valueLink(firm.website, websiteLabel(firm.website), true)));
  return items.join("\n");
}

function heroButtons(firm: Firm): string {
  const buttons = [
    `<a href="${escapeHtml(telHref(firm.phone))}" style="${BUTTON}">${icon(ICON_PHONE)}Ara</a>`,
  ];
  if (firm.whatsapp) {
    buttons.push(`<a href="${escapeHtml(whatsappHref(firm))}"${EXTERNAL} style="${BUTTON}">${icon(ICON_WHATSAPP)}WhatsApp</a>`);
  }
  // No offer form exists yet: the primary action is a plain e-mail to the firm's own address.
  buttons.push(`<a href="mailto:${escapeHtml(firm.email)}" style="${BUTTON_PRIMARY}">${icon(ICON_MAIL, 20, "#FFFFFF")}E-posta Gönder</a>`);
  return buttons.join("\n");
}

function introSection(firm: Firm): string {
  if (!firm.shortDescription) return "";
  return `<section aria-labelledby="profil-ozet" style="background: #F4F5FF; border: 1px solid #CDD3FF; border-radius: 12px; padding: 24px 28px; display: flex; flex-direction: column; gap: 8px">
<h2 id="profil-ozet" style="${H2}">Özgeçmiş</h2>
<p style="margin: 0; font-size: 18px; line-height: 1.55; color: #1F2A44">${escapeHtml(firm.shortDescription)}</p>
</section>`;
}

function addressSection(firm: Firm): string {
  return `<section aria-labelledby="profil-adres" style="${CARD}">
<h2 id="profil-adres" style="${H2}">Adres</h2>
<p style="margin: 0; display: flex; align-items: flex-start; gap: 8px; font-size: 16px; color: #3E4F63">${icon(ICON_PIN)}<span>${escapeHtml(firm.address)}</span></p>
</section>`;
}

/**
 * "Bu Profili Sahiplen" / "Firmayı Kaldır": links to the request forms for this firm id. Shown on
 * every published profile (no ownership state exists, so the claim button is never hidden).
 * Submitting only stores a request for the admin; nothing changes on the profile automatically.
 */
function requestSection(firm: Firm): string {
  return `<section aria-labelledby="profil-talepler" style="${CARD}">
<h2 id="profil-talepler" style="${H2}">Bu profil hakkında</h2>
<div style="display: flex; flex-wrap: wrap; gap: 10px">
<a href="${escapeHtml(firmRequestPath(firm, "sahiplen"))}" rel="nofollow" style="${BUTTON}">Bu Profili Sahiplen</a>
<a href="${escapeHtml(firmRequestPath(firm, "kaldir"))}" rel="nofollow" style="${BUTTON}">Firmayı Kaldır</a>
</div>
</section>`;
}

/* ---------- page ---------- */

export function buildProfileHtml(firm: Firm): string {
  const name = escapeHtml(firm.name);
  const city = escapeHtml(firm.city);

  const main = `
<section style="background: #FFFFFF; border-bottom: 1px solid #DCE3EC">
<div style="max-width: 1200px; margin: 0 auto; padding: 28px 24px 32px; display: flex; flex-direction: column; gap: 22px">
<nav aria-label="Konum" style="font-size: 14px; color: #5A6B80">
<ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px">
<li><a href="/" style="color: #0013A3; text-decoration: none">Ana Sayfa</a></li><li aria-hidden="true">›</li>
<li>${cityCrumb(firm.city)}</li><li aria-hidden="true">›</li>
<li aria-current="page" style="color: #3E4F63">${name}</li>
</ol>
</nav>
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 28px">
<div style="width: 140px; height: 140px; flex: none; border: 1px solid #DCE3EC; border-radius: 14px; background: #FFFFFF; display: flex; align-items: center; justify-content: center">${logo(firm)}</div>
<div style="flex: 999 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 8px; align-items: flex-start">
<h1 style="margin: 0; font-size: clamp(26px, 5vw, 34px); line-height: 1.2; letter-spacing: -0.01em; color: #0A1466; overflow-wrap: anywhere">${name}</h1>
<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 16px; color: #3E4F63">${icon(ICON_PIN, 18)}${city}</span>
${categoryLinks(firm)}
</div>
<div style="display: flex; flex-wrap: wrap; gap: 10px">
${heroButtons(firm)}
</div>
</div>
</div>
</section>

<main id="ana-icerik" style="max-width: 1200px; margin: 0 auto; padding: 36px 24px 72px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 28px">
<div style="flex: 999 1 600px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
${introSection(firm)}
${addressSection(firm)}
</div>
<aside style="flex: 1 1 320px; max-width: 420px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section aria-labelledby="profil-iletisim" style="${CARD}; gap: 4px">
<h2 id="profil-iletisim" style="${H2}; margin-bottom: 6px">İletişim Bilgileri</h2>
<ul style="list-style: none; margin: 0; padding: 0">
${contactList(firm)}
</ul>
</section>
${requestSection(firm)}
</aside>
</main>
`;

  return sitePageHtml(main);
}
