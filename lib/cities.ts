/*
 * City helpers and the SEED catalog: the 81 provinces exactly as the approved design lists them
 * (app/home.json footer "Şehirler" nav — same names, same slugs, same order).
 * `name` is the value stored in firms.city and shown to visitors; `slug` is the public URL segment
 * (/su-yumusatma-cihazi/<slug>). No imports: this module is used by server code and the admin client form.
 *
 * CITIES is only the first-run seed (lib/db.ts writes it to the SQLite `cities` table once). The
 * source of truth for validation, forms and public pages is the table — see lib/city-store.ts.
 */

export type City = { readonly name: string; readonly slug: string };

/**
 * Public address scheme: the category page is /su-yumusatma-cihazi and its city pages are
 * /su-yumusatma-cihazi/<city-slug>. The old /firmalar/<slug> and /sehirler URLs are no longer served;
 * "/firmalar/…" only survives inside the untouched design files, where the linkers below rewrite it.
 */
export const CATEGORY_SLUG = "su-yumusatma-cihazi";
export const CATEGORY_PATH = `/${CATEGORY_SLUG}`;

/**
 * The untouched design files link their "Şehirler" menu and footer items to the retired "/sehirler"
 * (404). At render time those hrefs are pointed at the category index instead.
 */
export function linkCategoryIndex(html: string): string {
  return applySiteName(html.replace(/href="\/sehirler\/?"/g, `href="${CATEGORY_PATH}"`));
}

/**
 * The design files show the old site name ("Endüstriyel Su Arıtma") as logo text and in the footer copyright.
 * They stay untouched; at render time only those brand spots (followed by "<", "." or a quote) get the
 * site name. Running text about industrial water treatment is not a brand spot and is left alone.
 * Every design page passes through linkCategoryIndex, so this is applied everywhere.
 */
export function applySiteName(html: string): string {
  return html.replace(/Endüstriyel Su Arıtma(?=[<."])/g, () => SITE_TITLE);
}

/** Public path of a city page, e.g. "ankara" → "/su-yumusatma-cihazi/ankara". */
export function cityPagePath(slug: string): string {
  return `${CATEGORY_PATH}/${slug}`;
}

export const CITIES: readonly City[] = [
  { name: "Adana", slug: "adana" },
  { name: "Adıyaman", slug: "adiyaman" },
  { name: "Afyonkarahisar", slug: "afyonkarahisar" },
  { name: "Ağrı", slug: "agri" },
  { name: "Aksaray", slug: "aksaray" },
  { name: "Amasya", slug: "amasya" },
  { name: "Ankara", slug: "ankara" },
  { name: "Antalya", slug: "antalya" },
  { name: "Ardahan", slug: "ardahan" },
  { name: "Artvin", slug: "artvin" },
  { name: "Aydın", slug: "aydin" },
  { name: "Balıkesir", slug: "balikesir" },
  { name: "Bartın", slug: "bartin" },
  { name: "Batman", slug: "batman" },
  { name: "Bayburt", slug: "bayburt" },
  { name: "Bilecik", slug: "bilecik" },
  { name: "Bingöl", slug: "bingol" },
  { name: "Bitlis", slug: "bitlis" },
  { name: "Bolu", slug: "bolu" },
  { name: "Burdur", slug: "burdur" },
  { name: "Bursa", slug: "bursa" },
  { name: "Çanakkale", slug: "canakkale" },
  { name: "Çankırı", slug: "cankiri" },
  { name: "Çorum", slug: "corum" },
  { name: "Denizli", slug: "denizli" },
  { name: "Diyarbakır", slug: "diyarbakir" },
  { name: "Düzce", slug: "duzce" },
  { name: "Edirne", slug: "edirne" },
  { name: "Elazığ", slug: "elazig" },
  { name: "Erzincan", slug: "erzincan" },
  { name: "Erzurum", slug: "erzurum" },
  { name: "Eskişehir", slug: "eskisehir" },
  { name: "Gaziantep", slug: "gaziantep" },
  { name: "Giresun", slug: "giresun" },
  { name: "Gümüşhane", slug: "gumushane" },
  { name: "Hakkari", slug: "hakkari" },
  { name: "Hatay", slug: "hatay" },
  { name: "Iğdır", slug: "igdir" },
  { name: "Isparta", slug: "isparta" },
  { name: "İstanbul", slug: "istanbul" },
  { name: "İzmir", slug: "izmir" },
  { name: "Kahramanmaraş", slug: "kahramanmaras" },
  { name: "Karabük", slug: "karabuk" },
  { name: "Karaman", slug: "karaman" },
  { name: "Kars", slug: "kars" },
  { name: "Kastamonu", slug: "kastamonu" },
  { name: "Kayseri", slug: "kayseri" },
  { name: "Kilis", slug: "kilis" },
  { name: "Kırıkkale", slug: "kirikkale" },
  { name: "Kırklareli", slug: "kirklareli" },
  { name: "Kırşehir", slug: "kirsehir" },
  { name: "Kocaeli", slug: "kocaeli" },
  { name: "Konya", slug: "konya" },
  { name: "Kütahya", slug: "kutahya" },
  { name: "Malatya", slug: "malatya" },
  { name: "Manisa", slug: "manisa" },
  { name: "Mardin", slug: "mardin" },
  { name: "Mersin", slug: "mersin" },
  { name: "Muğla", slug: "mugla" },
  { name: "Muş", slug: "mus" },
  { name: "Nevşehir", slug: "nevsehir" },
  { name: "Niğde", slug: "nigde" },
  { name: "Ordu", slug: "ordu" },
  { name: "Osmaniye", slug: "osmaniye" },
  { name: "Rize", slug: "rize" },
  { name: "Sakarya", slug: "sakarya" },
  { name: "Samsun", slug: "samsun" },
  { name: "Siirt", slug: "siirt" },
  { name: "Sinop", slug: "sinop" },
  { name: "Sivas", slug: "sivas" },
  { name: "Şanlıurfa", slug: "sanliurfa" },
  { name: "Şırnak", slug: "sirnak" },
  { name: "Tekirdağ", slug: "tekirdag" },
  { name: "Tokat", slug: "tokat" },
  { name: "Trabzon", slug: "trabzon" },
  { name: "Tunceli", slug: "tunceli" },
  { name: "Uşak", slug: "usak" },
  { name: "Van", slug: "van" },
  { name: "Yalova", slug: "yalova" },
  { name: "Yozgat", slug: "yozgat" },
  { name: "Zonguldak", slug: "zonguldak" },
];

/** City preselected in the admin form and used when a submitted city is empty (unchanged behaviour). */
export const DEFAULT_CITY = "Ankara";

/** Slug rule shared by the seed catalog and panel-added cities: lowercase a-z words joined by single hyphens. */
export const CITY_SLUG_PATTERN = /^[a-z]+(?:-[a-z]+)*$/;

/** "Şanlıurfa" → "sanliurfa", "Afyon Karahisar" → "afyon-karahisar". Empty string if nothing usable is left. */
export function slugifyCity(name: string): string {
  return name
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Turkish locative + "-ki" with the apostrophe used in the design: "Ankara’daki", "İzmir’deki",
 * "Kars’taki", "Kilis’teki" (vowel harmony on the last vowel, d→t after a voiceless consonant).
 */
export function cityLocative(name: string): string {
  const lower = name.toLocaleLowerCase("tr-TR");
  const vowels = lower.match(/[aıoueiöü]/g) ?? [];
  const front = "eiöü".includes(vowels[vowels.length - 1] ?? "a");
  const voiceless = /[fstkçşhp]$/.test(lower);
  return `${name}’${voiceless ? "t" : "d"}${front ? "e" : "a"}ki`;
}

/** Built-in city page title/description: used while the city's SEO record leaves them empty. */
/** Heading text as written in the design (app/home.json). Only used to find it; the design body is not edited. */
export const DESIGN_PAGE_KEYWORD = "Endüstriyel (Sanayi Tipi) Su Arıtma Firmaları";
/** Visible heading of the category page; city pages show "[Şehir Adı] " + this. */
export const CITY_PAGE_KEYWORD = "Su Yumuşatma Cihazı";
/** Subject of the design's visible description sentence (app/home.json stays unchanged) and its category/city replacement. */
export const DESIGN_DESCRIPTION_SUBJECT = "Endüstriyel ve sanayi tipi su arıtma sistemleri";
export const CITY_DESCRIPTION_SUBJECT = "Su yumuşatma cihazları";
/** Site name: the tail of every category / city / home title and the [Site Adı] token. Never removed from a title. */
export const SITE_TITLE = "Su Arıtma Cihazı Firmaları";

/** Display name of the one category that has public pages today (categories.name of CATEGORY_SLUG). */
export const MAIN_CATEGORY_NAME = "Su Yumuşatma Cihazı";

/*
 * Category name forms. A category has one display name; its three spellings are made with Turkish rules
 * (i/İ and ı/I are never mixed up):
 *   title    "Su Yumuşatma Cihazı"  — headings and tab titles
 *   sentence "su yumuşatma cihazı"  — inside a sentence ("Su yumuşatma cihazı sistemleri…" at its start)
 *   slug     "su-yumusatma-cihazi"  — the public address (stored separately, typed in the panel)
 */
export function categoryTitleForm(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const [head = "", ...tail] = Array.from(word);
      return head.toLocaleUpperCase("tr-TR") + tail.join("").toLocaleLowerCase("tr-TR");
    })
    .join(" ");
}

export function categorySentenceForm(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function upperFirst(text: string): string {
  const [head = "", ...tail] = Array.from(text);
  return head.toLocaleUpperCase("tr-TR") + tail.join("");
}

/** Name to use for a category: the stored name, or (older rows without one) the address read as words — ASCII only. */
export function categoryDisplayName(slug: string, storedName: string): string {
  return storedName.trim() || categoryTitleForm(slug.replaceAll("-", " "));
}

/*
 * Built-in page texts, in bracket form. Tokens are expanded when the page is rendered, so the numbers
 * always follow what the page lists: [Şehir Adı], [Firma Sayısı] (published, unique firms on that page).
 *   category: "Su Yumuşatma Cihazı: 142 Firma: Su Arıtma Cihazı Firmaları"
 *   city:     "Ankara Su Yumuşatma Cihazı: 14 Firma: Su Arıtma Cihazı Firmaları"
 */
export function categoryTitlePattern(name: string): string {
  return `${categoryTitleForm(name)}: [Firma Sayısı] Firma: ${SITE_TITLE}`;
}

export function categoryDescriptionPattern(name: string): string {
  return `${upperFirst(categorySentenceForm(name))} sistemleri ve hizmetleri hakkında bilgi alın. Türkiye genelindeki [Firma Sayısı] firmayı inceleyerek teklif isteyin.`;
}

export function cityTitlePattern(name: string): string {
  return `[Şehir Adı] ${categoryTitleForm(name)}: [Firma Sayısı] Firma: ${SITE_TITLE}`;
}

export function cityDescriptionPattern(name: string): string {
  return `[Şehir Adı] bölgesinde ${categorySentenceForm(name)} hizmeti için firmalara ulaşın. Bölgedeki [Firma Sayısı] firmayı inceleyin, iletişim kurun.`;
}

/** Homepage: [İl Sayısı] = number of different cities that have at least one published firm. */
export function homeTitle(cityCount: number): string {
  return `${SITE_TITLE}: (${cityCount} İlden Firmalar)`;
}

export function homeDescription(cityCount: number): string {
  return `Türkiye genelinde ${cityCount} farklı ilden su arıtma cihazı firmalarını inceleyin. Doğrudan teklif alın.`;
}

/** The patterns of the current category (used where no category row is at hand). */
export const CITY_TITLE_PATTERN = cityTitlePattern(MAIN_CATEGORY_NAME);
export const CITY_DESCRIPTION_PATTERN = cityDescriptionPattern(MAIN_CATEGORY_NAME);
export const CATEGORY_TITLE_PATTERN = categoryTitlePattern(MAIN_CATEGORY_NAME);
export const CATEGORY_DESCRIPTION_PATTERN = categoryDescriptionPattern(MAIN_CATEGORY_NAME);

/**
 * The texts the pages used before this pass (bracket form). lib/db.ts recognises a stored title/description
 * that still equals one of these once, and moves it to the new pattern. They are not used for rendering.
 */
export const LEGACY_PAGE_TEXTS = {
  categoryTitle: ["Su Yumuşatma Cihazı"],
  categoryDescription: ["Türkiye’deki su yumuşatma cihazı firmalarını şehre göre keşfedin."],
  cityTitle: ["[Şehir Adı] Su Yumuşatma Cihazı"],
  cityDescription: [
    "[Şehir Adı] bölgesindeki [Firma Sayısı] su yumuşatma cihazı firmasını ve sistemlerini inceleyin. Kurumsal profilleri ve iletişim bilgilerini keşfedin.",
  ],
} as const;

/** Heading of a rendered page: replaces the design's H1 (the first <h1 class="s15">), whatever it says now. */
export function setDesignH1(html: string, text: string): string {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  return html.replace(/<h1 class="s15">[^<]*<\/h1>/, () => `<h1 class="s15">${safe}</h1>`);
}

/**
 * Visible intro sentence under the design's H1 (the first <p class="s16"> after it), whatever it says now.
 * The homepage shows the same sentence as its tab description (homeDescription).
 */
export function setDesignIntro(html: string, text: string): string {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  return html.replace(/(<h1 class="s15">[^<]*<\/h1>\s*)<p class="s16">[^<]*<\/p>/, (_, head: string) => `${head}<p class="s16">${safe}</p>`);
}

/** Subject of the design's description sentence on the pages of a panel-added category: "Su arıtma cihazı sistemleri". */
export function categoryDescriptionSubject(name: string): string {
  return `${upperFirst(categorySentenceForm(name))} sistemleri`;
}

/** Tokens the admin copies one at a time. Each is replaced with the city's own value on the public page. */
export const CITY_TOKENS = ["[Şehir Adı]", "[Firma Sayısı]", "[Site Adı]"] as const;

/** Replaces [Şehir Adı], [Firma Sayısı] and [Site Adı] wherever they were written. */
export function applyCityTokens(text: string, name: string, firmCount: number): string {
  return text
    .replaceAll("[Şehir Adı]", name)
    .replaceAll("[Firma Sayısı]", String(firmCount))
    .replaceAll("[Site Adı]", SITE_TITLE);
}

/** "İstanbul Su Yumuşatma Cihazı" */
export function defaultCityTitle(name: string, firmCount = 0): string {
  return applyCityTokens(CITY_TITLE_PATTERN, name, firmCount);
}

export function defaultCityDescription(name: string, firmCount: number): string {
  return applyCityTokens(CITY_DESCRIPTION_PATTERN, name, firmCount);
}

/*
 * Design linkers. Pure functions: the caller (lib/city-store.ts) passes the cities that may be shown.
 *   visible — cities with at least one published firm (the only ones that get a link);
 *   known   — every city name the site has ever listed (seed catalog + panel cities). A design link whose
 *             text is a known city but not visible is removed; any other link is left exactly as designed.
 */

export type FooterGroup = { readonly slug: string; readonly name: string; readonly cities: readonly City[] };

const escapeText = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Name used in the footer heading in place of the design's old keyword: the site name without its trailing "Firmaları". */
export const SITE_TITLE_STEM = SITE_TITLE.replace(/ Firmaları$/, "");

/**
 * Footer "Şehir seçin" block of the design (app/home.json, nav class s112, links class s113):
 *  - the heading's old keyword ("Endüstriyel (Sanayi Tipi) Su Arıtma") is replaced by `heading`
 *    (the page's category name, or the site name on pages that belong to no single category);
 *  - the nav is rebuilt from `groups`: one group per category that has a published firm, each city linked to
 *    /<kategori-slug>/<sehir-slug>. A city without a published firm in the category is never in a group.
 *    One group = plain city list (category page); several groups = a category label above each list.
 */
export function linkCityNav(html: string, groups: readonly FooterGroup[], heading: string): string {
  const withHeading = html.replace(
    /(<h2 id="sehir-baslik"[^>]*>)([^<]*)(<\/h2>)/,
    (_, open: string, text: string, close: string) =>
      `${open}${text.replace("Endüstriyel (Sanayi Tipi) Su Arıtma", () => escapeText(heading))}${close}`,
  );
  return withHeading.replace(/<nav aria-label="Şehirler" class="s112">[\s\S]*?<\/nav>/, () => {
    const lists = groups
      .filter((group) => group.cities.length)
      .map((group) => {
        const anchors = group.cities
          .map((city) => `<a href="/${group.slug}/${city.slug}" class="s113">${escapeText(city.name)}</a>`)
          .join("\n");
        const label = groups.length > 1 ? escapeText(group.name) + " şehirleri" : "Şehirler";
        const nav = `<nav aria-label="${label}" class="s112">\n${anchors}\n</nav>`;
        return groups.length > 1
          ? `<p style="margin: 12px 0 4px; font-weight: 600">${escapeText(group.name)}</p>\n${nav}`
          : nav;
      });
    return lists.join("\n") || '<nav aria-label="Şehirler" class="s112">\n</nav>';
  });
}

export function linkHomeDesignNavigation(html: string, groups: readonly FooterGroup[], heading: string): string {
  return linkCityNav(html, groups, heading).replaceAll('href="/iletisim/#sikayet" data-pending="true"', 'href="/iletisim/sikayet"');
}

const TR_ALPHABET = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
const letterRank = (letter: string) => TR_ALPHABET.indexOf(letter);
const GROUP_PATTERN = /<div id="([dm])-harf-([a-z0-9-]+)"[^>]*>(?:(?!<\/div>)[\s\S])*?<\/ul>\s*<\/div>/g;

/**
 * The Şehirler design lists only some provinces. A visible city that the design does not list (every
 * other province, or a city opened in the panel) is added as a row of its letter group; a letter the
 * design has no group for gets a group (and alphabet-strip link) cloned from an existing one.
 * Designs without letter groups (the İletişim city picker) are returned unchanged.
 */
function addMissingCities(html: string, visible: readonly City[], rowTemplate: string): string {
  if (!rowTemplate || !html.includes("-harf-")) return html;
  const listed = new Set(Array.from(html.matchAll(/data-city-link="true"[^>]*>([^<]*)/g), (match) => (match[1] ?? "").trim()));
  const missing = visible.filter((city) => !listed.has(city.name));
  if (!missing.length) return html;

  const row = (city: City) =>
    rowTemplate.replace(/<a href="#" data-demo-link="true"([^>]*)>[\s\S]*?<\/a>/, (_, attrs: string) =>
      `<a href="${cityPagePath(city.slug)}" data-city-link="true"${attrs}>${city.name}</a>`);
  const listItems = (ul: string) => Array.from(ul.matchAll(/<li>[\s\S]*?<\/li>/g), (match) => match[0]);
  const nameOf = (item: string) => item.replace(/<[^>]*>/g, "").replace(/\(\d+\)/g, "").trim();
  const sortedRows = (items: string[]) => items.sort((a, b) => nameOf(a).localeCompare(nameOf(b), "tr")).join("\n");

  let result = html;
  const byLetter = new Map<string, City[]>();
  for (const city of missing) {
    const letter = (Array.from(city.name)[0] ?? "").toLocaleUpperCase("tr-TR");
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), city]);
  }

  for (const [letter, cities] of byLetter) {
    const groups = Array.from(result.matchAll(GROUP_PATTERN)).map((match) => ({
      full: match[0], prefix: match[1] ?? "d", id: `${match[1]}-harf-${match[2]}`,
      letter: (match[0].match(/<span[^>]*>([^<]*)<\/span>/)?.[1] ?? "").trim(),
    }));
    const existing = groups.find((group) => group.letter === letter);

    if (existing) {
      const updated = existing.full.replace(/(<ul[^>]*>)([\s\S]*?)(<\/ul>)/, (_, open: string, inner: string, close: string) =>
        `${open}\n${sortedRows([...listItems(inner), ...cities.map(row)])}\n${close}`);
      result = result.replace(existing.full, () => updated);
      continue;
    }

    const template = groups[0];
    if (!template) continue;
    const taken = new Set(groups.map((group) => group.id));
    let id = `${template.prefix}-harf-${slugifyCity(letter) || "x"}`;
    while (taken.has(id)) id += "-x";
    const group = template.full
      .replace(template.id, () => id)
      .replace(/(<span[^>]*>)[^<]*(<\/span>)/, (_, open: string, close: string) => `${open}${letter}${close}`)
      .replace(/(<ul[^>]*>)[\s\S]*?(<\/ul>)/, (_, open: string, close: string) => `${open}\n${sortedRows(cities.map(row))}\n${close}`);
    const next = groups.find((entry) => letterRank(entry.letter) > letterRank(letter));
    result = next
      ? result.replace(next.full, () => group + "\n" + next.full)
      : result.replace(groups[groups.length - 1]!.full, (last) => last + "\n" + group);

    // Alphabet strip: clone an existing link for the new letter, in alphabet order.
    const strip = Array.from(result.matchAll(new RegExp(`<a href="#${template.prefix}-harf-[a-z0-9-]+"[^>]*>[^<]*</a>`, "g")))
      .map((match) => ({ full: match[0], letter: (match[0].match(/>([^<]*)<\/a>$/)?.[1] ?? "").trim() }));
    const stripTemplate = strip[0];
    if (!stripTemplate) continue;
    const link = stripTemplate.full
      .replace(/href="#[^"]*"/, () => `href="#${id}"`)
      .replace(/>[^<]*<\/a>$/, () => `>${letter}</a>`);
    const nextLink = strip.find((entry) => letterRank(entry.letter) > letterRank(letter));
    result = nextLink
      ? result.replace(nextLink.full, () => link + " " + nextLink.full)
      : result.replace(strip[strip.length - 1]!.full, (last) => last + " " + link);
  }
  return result;
}

/**
 * City directory links in the Şehirler and İletişim designs (demo links: href "#", data-demo-link).
 * A visible city becomes a real link (data-city-link, which public/design.js treats as a normal link in
 * the list and in the search suggestions); a known city that is not visible is removed together with its
 * <li>. Letter groups left without any city (and their alphabet-strip links) are removed too.
 * Names that are not cities keep their demo link.
 */
export function linkCityDirectory(html: string, visible: readonly City[], known: ReadonlySet<string>): string {
  const byName = new Map(visible.map((city) => [city.name, city]));
  // Row template of the design, taken before any row is removed (used for visible cities the design lacks).
  const rowTemplate = html.match(/<li>\s*<a href="#" data-demo-link="true"[^>]*>[\s\S]*?<\/a>\s*<\/li>/)?.[0] ?? "";
  const linked = addMissingCities(html.replace(
    // Also matches anchors the design already points at /firmalar/<slug> (data-city-link): those are not demos,
    // but must still disappear when the city has no published firm.
    /(<li>\s*)?<a href="(#" data-demo-link="true|\/firmalar\/[a-z-]+" data-city-link="true)"([^>]*)>([\s\S]*?)<\/a>(\s*<\/li>)?/g,
    (link, open: string | undefined, hrefPart: string, _attrs: string, inner: string, close: string | undefined) => {
      const name = inner.replace(/<[^>]*>/g, "").replace(/\(\d+\)/g, "").trim();
      const city = byName.get(name);
      // Both the demo link and a design anchor that still points at /firmalar/<slug> get the category path.
      if (city) return link.replace(/href="(?:#" data-demo-link="true|\/firmalar\/[a-z-]+)"/, () => `href="${cityPagePath(city.slug)}"`);
      // Remove the whole <li>…</li>; if the anchor is not the only child, drop just the anchor.
      return known.has(name) ? (open && close ? "" : (open ?? "") + (close ?? "")) : link;
    },
  ), visible, rowTemplate);

  // Letter groups: <div id="d-harf-a" …><span>A</span><ul>…</ul></div> with an empty <ul> are dropped.
  const emptyGroups = new Set<string>();
  const withoutEmptyGroups = linked.replace(
    /<div id="([dm]-harf-[a-z0-9-]+)"[^>]*>(?:(?!<\/div>)[\s\S])*?<\/ul>\s*<\/div>\s*/g,
    (group, id: string) => {
      if (/<li[\s>]/.test(group)) return group;
      emptyGroups.add(id);
      return "";
    },
  );
  if (!emptyGroups.size) return withoutEmptyGroups;
  return withoutEmptyGroups.replace(/<a href="#([dm]-harf-[a-z0-9-]+)"[^>]*>[^<]*<\/a>\s*/g, (link, id: string) =>
    emptyGroups.has(id) ? "" : link);
}
