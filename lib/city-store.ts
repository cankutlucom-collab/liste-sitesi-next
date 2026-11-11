import { DESIGN_FAQS, getDb } from "./db";
import {
  CATEGORY_SLUG,
  CITIES,
  CITY_SLUG_PATTERN,
  categoryDisplayName,
  cityDescriptionPattern,
  cityPagePath,
  cityTitlePattern,
  linkCityDirectory as linkCityDirectoryFor,
  linkHomeDesignNavigation as linkHomeDesignNavigationFor,
  slugifyCity,
  SITE_TITLE_STEM,
  type City,
  type FooterGroup,
} from "./cities";
/*
 * SQLite-backed cities (tables `cities`, `city_faqs`; first-run seed in lib/db.ts).
 * Server-only. This is the single source for: which cities a firm may be assigned to, which city pages
 * exist, and which cities are shown to visitors.
 *
 * Visibility rule: a city page exists only while the city has at least one PUBLISHED firm in that
 * CATEGORY (firm_categories). A published firm in another city or another category does not count.
 * Otherwise the city is hidden everywhere (footer nav, city directory, search suggestions, sitemap)
 * and /su-yumusatma-cihazi/<slug> answers 404.
 */

type Row = Record<string, unknown>;

export const LIMITS = { name: 40, metaTitle: 120, metaDescription: 320, question: 200, answer: 1500, faqs: 30 } as const;

/** Error codes travel through redirects (?hata=…); the panel page turns them into text with ERROR_MESSAGES. */
export const ERROR_MESSAGES = {
  "ad-uzunluk": `Şehir adı 2–${LIMITS.name} karakter olmalı.`,
  "ad-karakter": "Şehir adı yalnızca harf, boşluk, tire ve kesme işareti içerebilir.",
  "adres-uretilemedi": "Bu addan geçerli bir adres (yalnızca a-z ve tire) üretilemedi.",
  "kayitli": "Bu şehir zaten kayıtlı.",
  "bulunamadi": "Şehir bulunamadı; silinmiş olabilir.",
  "firma-var": "Şehir silinemedi: bu şehirde firma kaydı var. Önce firmaları başka bir şehre taşıyın veya silin.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_MESSAGES, value);
}

export type Result = { ok: true } | { ok: false; code: ErrorCode };

export type CityAdminRow = City & { published: number; drafts: number };

const toCity = (row: Row): City => ({ name: String(row.name), slug: String(row.slug) });
const byTurkishName = (a: City, b: City) => a.name.localeCompare(b.name, "tr");

// Control and zero-width characters become spaces (built from code points to keep the source plain ASCII).
const CONTROL_CHARS = new RegExp(
  "[" + [[0x00, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x2029]]
    .map(([from, to]) => String.fromCharCode(from) + "-" + String.fromCharCode(to)).join("") + "]",
  "g",
);

export function clean(value: unknown): string {
  return String(value ?? "").normalize("NFC").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

/* ---------- lookups ---------- */

/** Every registered city (visible or not), Turkish alphabetical order. */
export function listCities(): City[] {
  return (getDb().prepare("SELECT slug, name FROM cities").all() as Row[]).map(toCity).sort(byTurkishName);
}

export function cityByName(name: string): City | null {
  const row = getDb().prepare("SELECT slug, name FROM cities WHERE name = ?").get(name) as Row | undefined;
  return row ? toCity(row) : null;
}

/** Exact slug match only ("ankara"); case variants, encoded names and unknown slugs are null. */
export function cityBySlug(slug: string): City | null {
  if (!CITY_SLUG_PATTERN.test(slug)) return null;
  const row = getDb().prepare("SELECT slug, name FROM cities WHERE slug = ?").get(slug) as Row | undefined;
  return row ? toCity(row) : null;
}

/** Firm validation: the city must be registered (panel-added cities count, deleted ones do not). */
export function isSupportedCity(name: string): boolean {
  return cityByName(name) !== null;
}

/** List URL of a registered city, or null, whether or not the page exists (admin revalidation). Visitor links use visibleCityPath. */
export function cityPath(name: string): string | null {
  const city = cityByName(name);
  return city ? cityPagePath(city.slug) : null;
}

// Per category AND city: a firm in another category (or another city) does not open this city's page.
const VISIBLE_SQL = `SELECT c.slug, c.name FROM cities c
  WHERE EXISTS (
    SELECT 1 FROM firms f
    JOIN firm_categories fc ON fc.firm_id = f.id
    WHERE f.city = c.name AND f.status = 'published' AND fc.category_slug = ?
  )`;

/**
 * Link target for a visitor-facing city link (breadcrumbs): the city's page path only while that page
 * exists for the category (published firm in this city AND category), otherwise null so no dead link is shown.
 */
export function visibleCityPath(name: string, categorySlug: string = CATEGORY_SLUG): string | null {
  const city = cityByName(name);
  return city && visibleCityBySlug(city.slug, categorySlug) ? cityPagePath(city.slug) : null;
}

/**
 * Cities that currently have at least one published firm IN THE GIVEN CATEGORY — the only cities
 * shown to visitors for that category (city pages, footer nav, sitemap, city directory).
 */
export function listVisibleCities(categorySlug: string = CATEGORY_SLUG): City[] {
  return (getDb().prepare(VISIBLE_SQL).all(categorySlug) as Row[]).map(toCity).sort(byTurkishName);
}

/** The registered city for a public slug, only while it has a published firm in the category; otherwise null (→ 404). */
export function visibleCityBySlug(slug: string, categorySlug: string = CATEGORY_SLUG): City | null {
  if (!CITY_SLUG_PATTERN.test(slug)) return null;
  const row = getDb().prepare(VISIBLE_SQL + " AND c.slug = ?").get(categorySlug, slug) as Row | undefined;
  return row ? toCity(row) : null;
}

/* ---------- design linkers (always current: pages call these per request) ---------- */

function knownCityNames(): Set<string> {
  return new Set([...CITIES.map((city) => city.name), ...listCities().map((city) => city.name)]);
}

/**
 * Footer city groups. With a category slug (category and city pages): that category only, named as the page names it.
 * Without one (homepage, profile, policy, blog pages): every category that has a published firm, each with its cities.
 * Only cities with a published firm in the category are included, so no link points to a missing page.
 */
export function listFooterGroups(categorySlug?: string): FooterGroup[] {
  const rows = getDb().prepare("SELECT slug, name FROM categories").all() as Row[];
  const groups = rows
    .map((row) => ({ slug: String(row.slug), name: categoryDisplayName(String(row.slug), String(row.name)) }))
    .filter((category) => !categorySlug || category.slug === categorySlug)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"))
    .map((category) => ({ ...category, cities: listVisibleCities(category.slug) }));
  return groups.filter((group) => group.cities.length > 0);
}

export function linkHomeDesignNavigation(html: string, categorySlug?: string): string {
  const groups = listFooterGroups(categorySlug);
  // Category page: the category's name; pages without a single category: the site name.
  const heading = categorySlug && groups[0] ? groups[0].name : SITE_TITLE_STEM;
  return linkHomeDesignNavigationFor(html, groups, heading);
}

export function linkCityDirectory(html: string): string {
  return linkCityDirectoryFor(html, listVisibleCities(), knownCityNames());
}

/* ---------- admin: list ---------- */

export function listCitiesForAdmin(): CityAdminRow[] {
  const rows = getDb()
    .prepare(
      `SELECT c.slug, c.name,
         (SELECT COUNT(*) FROM firms f WHERE f.city = c.name AND f.status = 'published') AS published,
         (SELECT COUNT(*) FROM firms f WHERE f.city = c.name AND f.status = 'draft') AS drafts
       FROM cities c`,
    )
    .all() as Row[];
  return rows
    .map((row) => ({ ...toCity(row), published: Number(row.published), drafts: Number(row.drafts) }))
    .sort(byTurkishName);
}

/* ---------- admin: create / delete ---------- */

function titleCase(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      const [head = "", ...tail] = Array.from(word);
      return head.toLocaleUpperCase("tr-TR") + tail.join("").toLocaleLowerCase("tr-TR");
    })
    .join(" ");
}

/** Slug is derived from the name with the catalog rule (lowercase, no Turkish characters, a-z and hyphen). */
export function createCity(rawName: unknown): Result & { slug?: string } {
  const name = titleCase(clean(rawName));
  if (name.length < 2 || name.length > LIMITS.name) return { ok: false, code: "ad-uzunluk" };
  if (!/^\p{L}[\p{L} '’-]*$/u.test(name)) return { ok: false, code: "ad-karakter" };
  const slug = slugifyCity(name);
  if (!slug || slug.length > LIMITS.name || !CITY_SLUG_PATTERN.test(slug)) return { ok: false, code: "adres-uretilemedi" };
  const db = getDb();
  if (db.prepare("SELECT 1 FROM cities WHERE slug = ? OR name = ?").get(slug, name)) return { ok: false, code: "kayitli" };
  db.prepare("INSERT INTO cities (slug, name, created_at) VALUES (?, ?, ?)").run(slug, name, new Date().toISOString());
  // The new city starts with the design's questions on the current category's city page (editable in the panel).
  const insertFaq = db.prepare("INSERT INTO page_faqs (category_slug, city_slug, question, answer, position) VALUES (?, ?, ?, ?, ?)");
  DESIGN_FAQS.forEach(([question, answer], index) => insertFaq.run(CATEGORY_SLUG, slug, question, answer, index + 1));
  // Title and description start filled with the built-in city patterns of every category (editable in the panel;
  // an existing record, which cannot exist for a brand-new city, would be kept).
  const categories = db.prepare("SELECT slug, name FROM categories").all() as Row[];
  const insertSeo = db.prepare(
    "INSERT OR IGNORE INTO page_seo (category_slug, city_slug, meta_title, meta_description) VALUES (?, ?, ?, ?)",
  );
  for (const category of categories) {
    const displayName = categoryDisplayName(String(category.slug), String(category.name));
    insertSeo.run(String(category.slug), slug, cityTitlePattern(displayName), cityDescriptionPattern(displayName));
  }
  return { ok: true, slug };
}

/** Refuses while ANY firm record (published or draft) uses the city. */
export function deleteCity(slug: string): Result {
  const city = cityBySlug(slug);
  if (!city) return { ok: false, code: "bulunamadi" };
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const used = db.prepare("SELECT COUNT(*) AS n FROM firms WHERE city = ?").get(city.name) as Row;
    if (Number(used.n) > 0) {
      db.exec("ROLLBACK");
      return { ok: false, code: "firma-var" };
    }
    db.prepare("DELETE FROM page_faqs WHERE city_slug = ?").run(slug);
    db.prepare("DELETE FROM page_seo WHERE city_slug = ?").run(slug);
    db.prepare("DELETE FROM city_faqs WHERE city_slug = ?").run(slug);
    db.prepare("DELETE FROM cities WHERE slug = ?").run(slug);
    db.exec("COMMIT");
    return { ok: true };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/* Page texts (title, description, FAQ) moved to lib/category-store.ts: they belong to a category + city pair. */
