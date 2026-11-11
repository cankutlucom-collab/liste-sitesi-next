import home from "../app/home.json";
import { firmLogoPath } from "./firm-logos";
import { firmProfilePath, phoneDigits, type Firm } from "./firms";
import {
  REVEAL_STEP,
  planCityListing,
  planHomeListing,
  rotationNow,
  rotationSlot,
  type ListingPlan,
  type PaidTier,
} from "./rotation";

export { REVEAL_STEP } from "./rotation";

/*
 * Server-side rendering of the public firm lists (homepage and city pages).
 * The approved design (app/home.json) is used only as a visual template: every demo card is
 * removed and only published SQLite rows with a package are rendered, each package in the card
 * style the design gives it (Altın s34, Gümüş s45, Bronz s53, Ekonomik s82).
 * Which firms appear, and in which order, is decided in lib/rotation.ts.
 */

const TEMPLATE_NAME = "Akyol Arıtma Teknolojileri";
const TEMPLATE_LOCATION = "Ankara · Yenimahalle";

function templateCard(pattern: RegExp, label: string): string {
  const card = home.match(pattern)?.[0] ?? "";
  // Fail loudly instead of silently rendering an empty list if the template changes.
  if (!card.startsWith("<article")) throw new Error(`${label} card template not found in app/home.json`);
  return card;
}

// Card templates of the approved design; their demo content is never rendered.
const TEMPLATES = {
  altin: templateCard(/<article\b[^>]*>(?:(?!<\/article>)[\s\S])*?Akyol Arıtma Teknolojileri[\s\S]*?<\/article>/, "Altın"),
  gumus: templateCard(/<article class="s45">[\s\S]*?<\/article>/, "Gümüş"),
  bronz: templateCard(/<article class="s53">[\s\S]*?<\/article>/, "Bronz"),
};

const FEATURED_SECTION = /<section aria-labelledby="one-cikan-baslik"[\s\S]*?<\/section>/;
const OTHER_SECTION = /<section aria-labelledby="diger-baslik"[\s\S]*?<\/section>/;
const OTHER_SECTION_WITH_SPACE = /<section aria-labelledby="diger-baslik"[\s\S]*?<\/section>\s*/;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Replaces the design's FAQ items with the page's own (same markup: details.s101 / summary.s102 / p.s103).
 * No items = the design's FAQ stays. Used by the category page and the category+city page.
 */
export function withPageFaq(page: string, faqs: { question: string; answer: string }[]): string {
  if (!faqs.length) return page;
  const items = faqs
    .map((faq) => `<details class="s101">\n<summary class="s102">${escapeHtml(faq.question)}</summary>\n<p class="s103">${escapeHtml(faq.answer)}</p>\n</details>`)
    .join("\n");
  return page.replace(
    /(<section aria-labelledby="sss-baslik"[^>]*>\s*<h2[^>]*>[\s\S]*?<\/h2>\s*)[\s\S]*?(<\/section>)/,
    (_, head: string, close: string) => `${head}${items}\n${close}`,
  );
}

export function logoLines(name: string): [string, string] {
  const words = name.toLocaleUpperCase("tr").split(" ").filter(Boolean);
  const first = words[0] ?? "";
  const rest = words.slice(1).join(" ");
  const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text);
  return [clip(first, 10), clip(rest, 20)];
}

/** Two-letter monogram for the Gümüş / Bronz / Ekonomik cards (design: "BS", "PP", "AS" …). */
export function initials(name: string): string {
  return name
    .toLocaleUpperCase("tr")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");
}

// 444 numbers are national-only (7 digits, no country code), so they must not get a "+" prefix.
export function telHref(stored: string): string {
  const digits = phoneDigits(stored);
  return /^444\d{4}$/.test(digits) ? "tel:" + digits : "tel:+" + digits;
}

function contactLine(firm: Firm): string {
  const link = (href: string, label: string, external = false) =>
    `<a href="${escapeHtml(href)}" class="s38"${external ? ' target="_blank" rel="noopener nofollow"' : ""}>${escapeHtml(label)}</a>`;
  const parts = [
    link(telHref(firm.phone), firm.phone),
    link("mailto:" + firm.email, firm.email),
  ];
  if (firm.whatsapp) parts.push(link("https://wa.me/" + phoneDigits(firm.whatsapp), "WhatsApp", true));
  if (firm.website) parts.push(link(firm.website, "Web sitesi", true));
  return `<span class="s39">${parts.join(" · ")}</span>`;
}

function introLine(firm: Firm): string {
  return firm.shortDescription ? `<p class="s40">${escapeHtml(firm.shortDescription)}</p>\n` : "";
}

// Function replacers only: user text must never be parsed as `$&`-style replacement patterns.
const put = (html: string) => () => html;

/** Optional short introduction, then address and contact rows (the location span already shows the city). */
function detailRows(firm: Firm): string {
  return `${introLine(firm)}<p class="s40">${escapeHtml(firm.address)}</p>\n${contactLine(firm)}`;
}

function nameLink(firm: Firm): string {
  return `<a href="${escapeHtml(firmProfilePath(firm))}" class="s38">${escapeHtml(firm.name)}</a>`;
}

export function firmLogoImage(firm: Firm, size: number): string | undefined {
  const src = firmLogoPath(firm);
  if (!src) return;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(firm.name)} logosu" width="${size}" height="${size}" loading="lazy" decoding="async" style="max-width:100%;max-height:100%;object-fit:contain">`;
}

function renderAltin(firm: Firm): string {
  const name = escapeHtml(firm.name);
  const [logoTop, logoBottom] = logoLines(firm.name).map(escapeHtml);
  // Logo and name open the firm's own profile page (same SQLite record, same tab).
  const profileHref = escapeHtml(firmProfilePath(firm));
  const city = escapeHtml(firm.city);

  return TEMPLATES.altin
    // Logo link: profile page + firm lettering instead of the demo logo text.
    .replace(/<a href="#" data-pending="true" class="s35">([\s\S]*?)<\/a>/, (_, inner: string) => {
      let textIndex = 0;
      const lettering = inner.replace(/(<text\b[^>]*>)[^<]*(<\/text>)/g, (_m, open: string, close: string) =>
        open + (textIndex++ === 0 ? logoTop : logoBottom) + close);
      return `<a href="${profileHref}" class="s35">${firmLogoImage(firm, 120) ?? lettering}</a>`;
    })
    // Accessible labels (logo, map) — before the visible name is inserted.
    .replaceAll(TEMPLATE_NAME, put(name))
    .replaceAll(TEMPLATE_LOCATION, put(city))
    .replace(/<a href="#" data-pending="true" class="s38">[\s\S]*?<\/a>/, put(nameLink(firm)))
    .replace(/<a href="#" data-pending="true" class="s41">[\s\S]*?<\/a>/,
      put(`<a href="mailto:${escapeHtml(firm.email)}" class="s41">Teklif Al</a>`))
    .replace(/<p class="s40">[\s\S]*?<\/p>/, put(detailRows(firm)));
}

/** Gümüş (s45) and Bronz (s53): monogram, name, city, details, "Teklif Al"; same data as Altın. */
function renderMonogramCard(template: string, firm: Firm): string {
  return template
    .replace(/(<div class="s(?:46|54)">)[^<]*(<\/div>)/, (_, open: string, close: string) =>
      open + (firmLogoImage(firm, 56) ?? escapeHtml(initials(firm.name))) + close)
    .replace(/<a href="#" data-pending="true" class="s38">[\s\S]*?<\/a>/, put(nameLink(firm)))
    // City first: the contact row inserted below reuses the s39 class.
    .replace(/<span class="s39">[^<]*<\/span>/, put(`<span class="s39">${escapeHtml(firm.city)}</span>`))
    .replace(/<p class="s40">[\s\S]*?<\/p>/, put(detailRows(firm)))
    .replace(/<a href="#" data-pending="true" class="(s41|s56)">[\s\S]*?<\/a>/, (_, cls: string) =>
      `<a href="mailto:${escapeHtml(firm.email)}" class="${cls}">Teklif Al</a>`);
}

function compactCardContent(firm: Firm): string {
  const profileHref = escapeHtml(firmProfilePath(firm));
  const description = firm.shortDescription
    ? `<p class="firm-card-description">${escapeHtml(firm.shortDescription)}</p>` : "";
  return `<div class="firm-card-content">
<div class="firm-card-logo">${firmLogoImage(firm, 96) ?? escapeHtml(initials(firm.name))}</div>
<h3 class="firm-card-name" title="${escapeHtml(firm.name)}">${nameLink(firm)}</h3>
${description}
<a href="${profileHref}" class="firm-card-profile">Profili Gör</a>
</div>`;
}

type Tier = PaidTier | "ekonomik";

function renderPaidCard(firm: Firm, tier: PaidTier): string {
  if (tier === "altin") return renderAltin(firm);
  if (tier === "gumus") return renderMonogramCard(TEMPLATES.gumus, firm);
  return renderMonogramCard(TEMPLATES.bronz, firm);
}

/**
 * Marks a card for the same-page "Daha fazla gör" control; cards past the initial layout start hidden.
 * data-firm-id / data-package are test hooks (and harmless for visitors).
 */
function card(firm: Firm, tier: Tier, hidden: boolean): string {
  const attributes = `data-firm-card data-firm-id="${firm.id}" data-package="${tier}"` + (hidden ? " hidden" : "");
  const compact = compactCardContent(firm);
  if (tier === "ekonomik") return `<article ${attributes} class="s82">${compact}</article>`;
  return renderPaidCard(firm, tier)
    .replace(/^<article([^>]*)>/, (_, attrs) => `<article ${attributes}${attrs}><div class="firm-card-standard">`)
    .replace(/<\/article>$/, () => `</div>${compact}</article>`);
}

const VIEWS = [
  { key: "standard", label: "Standart", icon: '<rect x="3" y="3" width="6" height="12"/><path d="M12 4h9m-9 5h9m-9 5h9M3 20h18"/>' },
  { key: "square", label: "Kare", icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
  { key: "rectangle", label: "Dikdörtgen", icon: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>' },
];

const VIEW_OPTIONS = `<div class="firm-view-options" role="group" aria-label="Kart görünümü" hidden>
${VIEWS.map(({ key, label, icon }) => `<button type="button" data-firm-view="${key}" aria-label="${label}" title="${label}" aria-pressed="${key === "standard"}">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>
</button>`).join("")}
</div>`;

const CHEVRON_DOWN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0013A3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';
const CHEVRON_UP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0013A3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"></path></svg>';

/** Without JavaScript every card is shown instead (the buttons stay hidden). */
const NOSCRIPT_SHOW_ALL = "<noscript><style>" +
  ".s32 article[hidden],.s78 article[hidden]{display:flex}.s32 [data-card-grid][hidden]{display:grid}" +
  "@media(max-width:700px){.s32 article[hidden]:not(.s82){display:grid}}" +
  "</style></noscript>";

/**
 * Buttons only (no links, no query string): the URL never changes. They start hidden and
 * public/app.js reveals them. `initial` cards are visible on load, each click reveals REVEAL_STEP more.
 */
function moreControls(remaining: number, initial: number): string {
  return `<div class="list-more" data-more-list data-initial="${initial}" data-step="${REVEAL_STEP}" hidden>
<button type="button" class="s86" data-more>Daha fazla gör (<span data-more-count>${remaining}</span> firma daha)
${CHEVRON_DOWN}</button>
<button type="button" class="s86" data-close hidden>Kapat
${CHEVRON_UP}</button>
</div>
${NOSCRIPT_SHOW_ALL}`;
}

function emptyState(message: string): string {
  return `<article class="s34"><div class="s36"><h3 class="s37">${escapeHtml(message)}</h3>` +
    '<span class="s39">Firmalar yönetim panelinden yayınlandığında burada listelenir.</span></div></article>';
}

/** Adds the rotation slot to a section's opening tag (test hook: which 3-hour slot was rendered). */
function tagSlot(section: string, slot: number): string {
  return section.replace(/^<section\b/, () => `<section data-rotation-slot="${slot}"`);
}

function withViewOptions(section: string): string {
  return section.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/, (heading) =>
    `<div class="firm-list-heading">${heading}${VIEW_OPTIONS}</div>`);
}

/**
 * Fills the "Öne Çıkan" section. DOM order = reveal order:
 *   initial Altın, initial Gümüş, [design banner "8. karttan sonra"], initial Bronz,
 *   Ekonomik grid and controls (city pages only).
 * The design's banner keeps its place between the Gümüş and Bronz groups.
 */
function fillFeatured(section: string, plan: ListingPlan, emptyMessage: string, includeEconomy: boolean): string {
  const { altin, gumus, bronz } = plan.paid;
  const economyInitial = includeEconomy ? plan.ekonomik.initial : [];
  const economyExtra = includeEconomy ? plan.ekonomik.extra : [];
  const initialCount = altin.length + gumus.length + bronz.length + economyInitial.length;
  const hiddenCount = economyExtra.length;

  let head: string;
  let tail: string;
  if (initialCount + hiddenCount === 0) {
    head = emptyState(emptyMessage);
    tail = "";
  } else {
    head = [
      ...altin.map((firm) => card(firm, "altin", false)),
      ...gumus.map((firm) => card(firm, "gumus", false)),
    ].join("\n");
    const parts = bronz.map((firm) => card(firm, "bronz", false));
    if (economyInitial.length || economyExtra.length) {
      const economyCards = [
        ...economyInitial.map((firm) => card(firm, "ekonomik", false)),
        ...economyExtra.map((firm) => card(firm, "ekonomik", true)),
      ];
      parts.push(`<div class="s81" data-card-grid>\n${economyCards.join("\n")}\n</div>`);
    }
    if (hiddenCount > 0) parts.push(moreControls(hiddenCount, initialCount));
    tail = parts.join("\n");
  }

  let headPlaced = false;
  let tailPlaced = false;
  const filled = section.replace(/<article\b[^>]*>[\s\S]*?<\/article>\s*/g, (demo) => {
    // Every demo card is removed; the lists are inserted where the first Altın and first Bronz demo cards stood.
    if (!headPlaced && demo.includes(TEMPLATE_NAME)) {
      headPlaced = true;
      return head ? head + "\n\n" : "";
    }
    if (!tailPlaced && demo.startsWith('<article class="s53"')) {
      tailPlaced = true;
      return tail ? tail + "\n\n" : "";
    }
    return "";
  });
  // Template safety: never lose cards if the design's Bronz demo card is gone.
  return tailPlaced || !tail ? filled : filled.replace(/<\/section>$/, () => tail + "\n</section>");
}

/** Homepage Ekonomik block: fills the remaining initial places, then reveals the rest on demand. */
function fillOtherSection(section: string, plan: ListingPlan): string {
  const { initial, extra } = plan.ekonomik;
  const cards = [
    ...initial.map((firm) => card(firm, "ekonomik", false)),
    ...extra.map((firm) => card(firm, "ekonomik", true)),
  ].join("\n");
  return section
    .replace(/(<div class="s81">)[\s\S]*?(<\/div>\s*<a href="\/\?sayfa=2")/, (_, open: string, close: string) =>
      `${open}\n${cards}\n${close}`)
    // The design's sample link ("28 firma daha", ?sayfa=2) becomes the same-page controls, or nothing.
    .replace(/<a href="\/\?sayfa=2"[\s\S]*?<\/a>/, () => (extra.length ? moreControls(extra.length, initial.length) : ""));
}

/** Homepage: all cities. `now` is injectable for tests; pages use the real (or LISTE_ROTATION_NOW) time. */
export function buildHomeListingHtml(page: string, allPublished: Firm[], emptyMessage: string, now: Date = rotationNow()): string {
  const plan = planHomeListing(allPublished, rotationSlot(now));
  const hasEkonomik = plan.ekonomik.initial.length + plan.ekonomik.extra.length > 0;
  const hasFeatured = Object.values(plan.paid).some(group => group.length);
  return page
    .replace(FEATURED_SECTION, (section) => {
      const featured = tagSlot(fillFeatured(section, plan, hasEkonomik ? "Henüz öne çıkan firma yok." : emptyMessage, false), plan.slot);
      return hasFeatured ? withViewOptions(featured) : featured;
    })
    .replace(hasEkonomik ? OTHER_SECTION : OTHER_SECTION_WITH_SPACE, (section) => {
      // No Ekonomik firm: the block is dropped instead of showing an empty frame.
      if (!hasEkonomik) return "";
      const other = tagSlot(fillOtherSection(section, plan), plan.slot);
      return hasFeatured ? other : withViewOptions(other);
    });
}

/** City page: capped paid groups followed by the city's Ekonomik cards. */
export function buildCityListingHtml(page: string, allPublished: Firm[], city: string, emptyMessage: string, now: Date = rotationNow()): string {
  const plan = planCityListing(allPublished, city, rotationSlot(now));
  return page
    .replace(FEATURED_SECTION, (section) => {
      const featured = tagSlot(fillFeatured(section, plan, emptyMessage, true), plan.slot);
      return featured.includes("data-firm-card") ? withViewOptions(featured) : featured;
    })
    .replace(OTHER_SECTION_WITH_SPACE, "");
}
