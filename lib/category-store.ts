import { DESIGN_FAQS, getDb } from "./db";
import {
  CITY_SLUG_PATTERN, applyCityTokens, categoryDescriptionPattern, categoryDisplayName, categoryTitleForm,
  categoryTitlePattern, cityDescriptionPattern, cityTitlePattern, slugifyCity, CATEGORY_SLUG,
} from "./cities";
import { LIMITS, cityBySlug, clean } from "./city-store";

/*
 * Categories and the editable texts of their pages. Server-only.
 *   categories      — slug only (the public address segment). No display name is stored.
 *   page_seo        — title + description per page;   page_faqs — FAQ per page.
 * A "page" is a category page (city = "") or a category+city page (city = <city slug>).
 * Empty title/description mean "use the built-in default"; a page without FAQ rows keeps the design's FAQ.
 */

type Row = Record<string, unknown>;

export const CATEGORY_SLUG_MAX = 60;
export const CATEGORY_NAME_MAX = 60;

/** Page name: starts with a letter; letters, spaces, hyphen, apostrophe and parentheses follow. */
const NAME_PATTERN = /^\p{L}[\p{L} '’()-]*$/u;

/** Top-level addresses already used by the site (or reserved for it): a category slug may not take them. */
const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin", "api", "blog", "iletisim", "firma", "firmalar", "firma-profili", "sehirler", "sehir",
  "kategori", "kategoriler", "banner-gorsel", "kvkk-aydinlatma-metni", "kvkk-basvurusu",
  "kullanim-kosullari", "cerez-bilgilendirmesi", "robots", "sitemap", "sikayet", "basvuru",
]);

/** True for the addresses the site itself uses: no public category page may exist under them. */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** Error codes travel through redirects (?hata=…); the panel page turns them into text with ERROR_MESSAGES. */
export const ERROR_MESSAGES = {
  "adres-uzunluk": `Kategori adresi 2–${CATEGORY_SLUG_MAX} karakter olmalı.`,
  "adres-karakter": "Kategori adresi yalnızca küçük harf (a-z) ve tire içerebilir: Türkçe karakter, büyük harf, rakam, boşluk ve başta/sonda/art arda tire kullanılamaz (ör. su-aritma-cihazi).",
  "adres-ayrilmis": "Bu adres sitenin başka bir sayfası için ayrılmış. Başka bir adres seçin.",
  "adres-sabit": "Ana kategorinin adresi değiştirilemez.",
  "ad-uzunluk": `Sayfa adı 2–${CATEGORY_NAME_MAX} karakter olmalı.`,
  "ad-karakter": "Sayfa adı yalnızca harf, boşluk, tire, kesme işareti ve parantez () içerebilir (ör. Endüstriyel Su Arıtma Cihazı (Ters Ozmoz)).",
  "kategori-kayitli": "Bu kategori zaten kayıtlı.",
  "kategori-yok": "Kategori bulunamadı.",
  "sehir-yok": "Şehir bulunamadı; silinmiş olabilir.",
  "baslik-uzun": `Sayfa başlığı en fazla ${LIMITS.metaTitle} karakter olabilir.`,
  "aciklama-uzun": `Meta açıklama en fazla ${LIMITS.metaDescription} karakter olabilir.`,
  "soru-kisa": "Soru en az 3 karakter olmalı.",
  "soru-uzun": `Soru en fazla ${LIMITS.question} karakter olabilir.`,
  "cevap-kisa": "Cevap en az 3 karakter olmalı.",
  "cevap-uzun": `Cevap en fazla ${LIMITS.answer} karakter olabilir.`,
  "soru-limit": `Bir sayfa için en fazla ${LIMITS.faqs} soru eklenebilir.`,
  "soru-yok": "Soru bulunamadı; silinmiş olabilir.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_MESSAGES, value);
}

export type Result = { ok: true } | { ok: false; code: ErrorCode };

export type Category = { slug: string; name: string };
export type CategoryAdminRow = Category & { published: number; total: number };
export type PageFaq = { id: number; question: string; answer: string };
export type PageSeo = { metaTitle: string; metaDescription: string; faqs: PageFaq[] };
export type CategoryCityRow = { slug: string; name: string; published: number; faqCount: number; hasText: boolean };

/* ---------- categories ---------- */

/** Every registered category, by slug. Firm form choices and the panel list. */
export function listCategories(): Category[] {
  const rows = getDb().prepare("SELECT slug, name FROM categories ORDER BY slug").all() as Row[];
  return rows.map((row) => ({ slug: String(row.slug), name: categoryDisplayName(String(row.slug), String(row.name)) }));
}

/** Display name of a registered category ("Su Yumuşatma Cihazı"); null for an unknown slug. */
export function getCategoryName(slug: string): string | null {
  const row = getDb().prepare("SELECT name FROM categories WHERE slug = ?").get(slug) as Row | undefined;
  return row ? categoryDisplayName(slug, String(row.name)) : null;
}

/** Built-in title + description of a page (bracket form): what an empty field means. "" = category page. */
export function defaultPageTexts(categorySlug: string, citySlug: string): { title: string; description: string } {
  const name = getCategoryName(categorySlug) ?? "";
  if (!name) return { title: "", description: "" };
  return citySlug
    ? { title: cityTitlePattern(name), description: cityDescriptionPattern(name) }
    : { title: categoryTitlePattern(name), description: categoryDescriptionPattern(name) };
}

/**
 * The title and description a visitor gets for a page: the saved text, or the built-in pattern while a field
 * is empty, with the tokens replaced. `firmCount` = published, unique firms listed on that page.
 */
export function resolvePageTexts(
  categorySlug: string, citySlug: string, cityName: string, firmCount: number,
): { title: string; description: string } {
  const seo = getPageSeo(categorySlug, citySlug);
  const fallback = defaultPageTexts(categorySlug, citySlug);
  return {
    title: applyCityTokens(seo?.metaTitle || fallback.title, cityName, firmCount),
    description: applyCityTokens(seo?.metaDescription || fallback.description, cityName, firmCount),
  };
}

export function categoryExists(slug: string): boolean {
  return CITY_SLUG_PATTERN.test(slug) && getDb().prepare("SELECT 1 FROM categories WHERE slug = ?").get(slug) !== undefined;
}

export function listCategoriesForAdmin(): CategoryAdminRow[] {
  const rows = getDb()
    .prepare(
      `SELECT c.slug, c.name,
         (SELECT COUNT(*) FROM firm_categories fc JOIN firms f ON f.id = fc.firm_id
            WHERE fc.category_slug = c.slug AND f.status = 'published') AS published,
         (SELECT COUNT(*) FROM firm_categories fc WHERE fc.category_slug = c.slug) AS total
       FROM categories c ORDER BY c.slug`,
    )
    .all() as Row[];
  return rows.map((row) => ({
    slug: String(row.slug), name: categoryDisplayName(String(row.slug), String(row.name)),
    published: Number(row.published), total: Number(row.total),
  }));
}

/**
 * Adds a category. The address is the typed text turned into a slug (Turkish letters, spaces and capitals
 * included). The page name is stored as written; an empty name is taken from that same text.
 * The category page starts with the design's FAQ so there is something to edit.
 */
export function createCategory(rawSlug: unknown, rawName: unknown): Result & { slug?: string } {
  const typed = clean(rawSlug);
  const slug = slugifyCity(typed);
  if (slug.length < 2 || slug.length > CATEGORY_SLUG_MAX) return { ok: false, code: "adres-uzunluk" };
  if (!CITY_SLUG_PATTERN.test(slug)) return { ok: false, code: "adres-karakter" };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, code: "adres-ayrilmis" };
  const written = clean(rawName).replace(/\s+/g, " ");
  const phrase = /[^\u0000-\u007F]|\s/.test(typed) ? typed : slug.replaceAll("-", " ");
  const name = written || categoryTitleForm(phrase);
  if (name.length < 2 || name.length > CATEGORY_NAME_MAX) return { ok: false, code: "ad-uzunluk" };
  if (!NAME_PATTERN.test(name)) return { ok: false, code: "ad-karakter" };
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (db.prepare("SELECT 1 FROM categories WHERE slug = ?").get(slug)) {
      db.exec("ROLLBACK");
      return { ok: false, code: "kategori-kayitli" };
    }
    db.prepare("INSERT INTO categories (slug, created_at, name) VALUES (?, ?, ?)").run(slug, new Date().toISOString(), name);
    // Title and description of the category page and of every registered city's page start filled (editable in the panel).
    const insertSeo = db.prepare("INSERT OR IGNORE INTO page_seo (category_slug, city_slug, meta_title, meta_description) VALUES (?, ?, ?, ?)");
    insertSeo.run(slug, "", categoryTitlePattern(name), categoryDescriptionPattern(name));
    for (const city of db.prepare("SELECT slug FROM cities").all() as Row[]) {
      insertSeo.run(slug, String(city.slug), cityTitlePattern(name), cityDescriptionPattern(name));
    }
    const insertFaq = db.prepare("INSERT INTO page_faqs (category_slug, city_slug, question, answer, position) VALUES (?, '', ?, ?, ?)");
    DESIGN_FAQS.forEach(([question, answer], index) => insertFaq.run(slug, question, answer, index + 1));
    db.exec("COMMIT");
    return { ok: true, slug };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * Changes the address of a category. The typed text goes through the same address rule as on add.
 * Firms, page texts and FAQ move to the new address; the page name stays as it is.
 * The built-in main category keeps its address (its public pages are fixed in code).
 */
export function renameCategorySlug(oldSlug: string, rawSlug: unknown): Result & { slug?: string } {
  if (!categoryExists(oldSlug)) return { ok: false, code: "kategori-yok" };
  const slug = slugifyCity(clean(rawSlug));
  if (slug === oldSlug) return { ok: true, slug };
  if (oldSlug === CATEGORY_SLUG) return { ok: false, code: "adres-sabit" };
  if (slug.length < 2 || slug.length > CATEGORY_SLUG_MAX) return { ok: false, code: "adres-uzunluk" };
  if (!CITY_SLUG_PATTERN.test(slug)) return { ok: false, code: "adres-karakter" };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, code: "adres-ayrilmis" };
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (db.prepare("SELECT 1 FROM categories WHERE slug = ?").get(slug)) {
      db.exec("ROLLBACK");
      return { ok: false, code: "kategori-kayitli" };
    }
    // Foreign keys point at categories(slug): add the new row first, move the children, drop the old row.
    db.prepare("INSERT INTO categories (slug, created_at, name) SELECT ?, created_at, name FROM categories WHERE slug = ?").run(slug, oldSlug);
    for (const table of ["firm_categories", "page_seo", "page_faqs"]) {
      db.prepare(`UPDATE ${table} SET category_slug = ? WHERE category_slug = ?`).run(slug, oldSlug);
    }
    db.prepare("DELETE FROM categories WHERE slug = ?").run(oldSlug);
    db.exec("COMMIT");
    return { ok: true, slug };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Category+city rows for the panel: every registered city with its published firms in this category and its text state. */
export function listCategoryCities(categorySlug: string): CategoryCityRow[] {
  const rows = getDb()
    .prepare(
      `SELECT c.slug, c.name,
         (SELECT COUNT(*) FROM firms f JOIN firm_categories fc ON fc.firm_id = f.id
            WHERE f.city = c.name AND f.status = 'published' AND fc.category_slug = ?) AS published,
         (SELECT COUNT(*) FROM page_faqs q WHERE q.category_slug = ? AND q.city_slug = c.slug) AS faq_count,
         (SELECT s.meta_title FROM page_seo s WHERE s.category_slug = ? AND s.city_slug = c.slug) AS saved_title,
         (SELECT s.meta_description FROM page_seo s WHERE s.category_slug = ? AND s.city_slug = c.slug) AS saved_description
       FROM cities c`,
    )
    .all(categorySlug, categorySlug, categorySlug, categorySlug) as Row[];
  const defaults = defaultPageTexts(categorySlug, "x");
  // "Own text" = a saved title/description that differs from the built-in pattern (the pattern itself is the default).
  const differs = (saved: unknown, builtIn: string) => String(saved ?? "") !== "" && String(saved) !== builtIn;
  return rows
    .map((row) => ({
      slug: String(row.slug), name: String(row.name), published: Number(row.published),
      faqCount: Number(row.faq_count),
      hasText: differs(row.saved_title, defaults.title) || differs(row.saved_description, defaults.description),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

/* ---------- page texts ---------- */

/** "" = the category page; otherwise a registered city slug. Null when the category or city does not exist. */
function validScope(categorySlug: string, citySlug: string): ErrorCode | null {
  if (!categoryExists(categorySlug)) return "kategori-yok";
  if (citySlug !== "" && !cityBySlug(citySlug)) return "sehir-yok";
  return null;
}

/** Stored texts of a page; empty strings / no FAQ rows when nothing was saved yet. Null for an unknown category or city. */
export function getPageSeo(categorySlug: string, citySlug: string): PageSeo | null {
  if (validScope(categorySlug, citySlug)) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT meta_title, meta_description FROM page_seo WHERE category_slug = ? AND city_slug = ?")
    .get(categorySlug, citySlug) as Row | undefined;
  const faqs = (
    db.prepare("SELECT id, question, answer FROM page_faqs WHERE category_slug = ? AND city_slug = ? ORDER BY position, id")
      .all(categorySlug, citySlug) as Row[]
  ).map((faq) => ({ id: Number(faq.id), question: String(faq.question), answer: String(faq.answer) }));
  return { metaTitle: String(row?.meta_title ?? ""), metaDescription: String(row?.meta_description ?? ""), faqs };
}

/** Empty strings are valid and mean "use the built-in default text". */
export function savePageMeta(categorySlug: string, citySlug: string, rawTitle: unknown, rawDescription: unknown): Result {
  const scope = validScope(categorySlug, citySlug);
  if (scope) return { ok: false, code: scope };
  const title = clean(rawTitle);
  const description = clean(rawDescription);
  if (title.length > LIMITS.metaTitle) return { ok: false, code: "baslik-uzun" };
  if (description.length > LIMITS.metaDescription) return { ok: false, code: "aciklama-uzun" };
  getDb()
    .prepare(
      `INSERT INTO page_seo (category_slug, city_slug, meta_title, meta_description) VALUES (?, ?, ?, ?)
       ON CONFLICT (category_slug, city_slug) DO UPDATE SET meta_title = excluded.meta_title, meta_description = excluded.meta_description`,
    )
    .run(categorySlug, citySlug, title, description);
  return { ok: true };
}

function checkFaq(rawQuestion: unknown, rawAnswer: unknown): { question: string; answer: string } | ErrorCode {
  const question = clean(rawQuestion);
  const answer = clean(rawAnswer);
  if (question.length < 3) return "soru-kisa";
  if (question.length > LIMITS.question) return "soru-uzun";
  if (answer.length < 3) return "cevap-kisa";
  if (answer.length > LIMITS.answer) return "cevap-uzun";
  return { question, answer };
}

export function addPageFaq(categorySlug: string, citySlug: string, rawQuestion: unknown, rawAnswer: unknown): Result {
  const scope = validScope(categorySlug, citySlug);
  if (scope) return { ok: false, code: scope };
  const checked = checkFaq(rawQuestion, rawAnswer);
  if (typeof checked === "string") return { ok: false, code: checked };
  const db = getDb();
  const stats = db
    .prepare("SELECT COUNT(*) AS n, COALESCE(MAX(position), 0) AS last FROM page_faqs WHERE category_slug = ? AND city_slug = ?")
    .get(categorySlug, citySlug) as Row;
  if (Number(stats.n) >= LIMITS.faqs) return { ok: false, code: "soru-limit" };
  db.prepare("INSERT INTO page_faqs (category_slug, city_slug, question, answer, position) VALUES (?, ?, ?, ?, ?)")
    .run(categorySlug, citySlug, checked.question, checked.answer, Number(stats.last) + 1);
  return { ok: true };
}

export function updatePageFaq(categorySlug: string, citySlug: string, id: number, rawQuestion: unknown, rawAnswer: unknown): Result {
  const checked = checkFaq(rawQuestion, rawAnswer);
  if (typeof checked === "string") return { ok: false, code: checked };
  const result = getDb()
    .prepare("UPDATE page_faqs SET question = ?, answer = ? WHERE id = ? AND category_slug = ? AND city_slug = ?")
    .run(checked.question, checked.answer, id, categorySlug, citySlug);
  return result.changes === 1 ? { ok: true } : { ok: false, code: "soru-yok" };
}

export function deletePageFaq(categorySlug: string, citySlug: string, id: number): Result {
  const result = getDb()
    .prepare("DELETE FROM page_faqs WHERE id = ? AND category_slug = ? AND city_slug = ?")
    .run(id, categorySlug, citySlug);
  return result.changes === 1 ? { ok: true } : { ok: false, code: "soru-yok" };
}
