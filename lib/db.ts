import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import {
  CATEGORY_SLUG, CITIES, LEGACY_PAGE_TEXTS, MAIN_CATEGORY_NAME, categoryDescriptionPattern, categoryDisplayName,
  categoryTitlePattern, cityDescriptionPattern, cityTitlePattern,
} from "./cities";
import { uniqueFirmSlug } from "./firm-slug";

// One connection per server process (survives dev hot reloads).
const globalForDb = globalThis as unknown as { __listeDb?: DatabaseSync; __listeSchema?: number };
// Bump when migrate() gains a step, so connections cached by an older build get migrated too.
const SCHEMA_VERSION = 5;

function databaseFile() {
  return process.env.LISTE_DB_PATH || path.join(process.cwd(), "data", "liste.sqlite");
}

/** Additive, idempotent migrations for databases created by earlier versions. */
function migrate(db: DatabaseSync) {
  const columns = (db.prepare("PRAGMA table_info(firms)").all() as { name: string }[]).map((c) => c.name);
  if (!columns.includes("short_description")) {
    // Existing rows get an empty introduction; nothing else changes.
    db.exec("ALTER TABLE firms ADD COLUMN short_description TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.includes("package_level")) {
    // Manually assigned package. Existing rows get NULL (= no package assigned); nothing else changes.
    // Keep this allow-list in sync with PACKAGE_LEVELS in lib/firms.ts.
    db.exec(
      "ALTER TABLE firms ADD COLUMN package_level TEXT DEFAULT NULL " +
        "CHECK (package_level IS NULL OR package_level IN ('altin', 'gumus', 'bronz', 'ekonomik'))",
    );
  }
  if (!columns.includes("slug")) {
    // Public address segment /firmalar/<slug> (lib/firm-slug.ts). Existing rows are filled just below.
    db.exec("ALTER TABLE firms ADD COLUMN slug TEXT DEFAULT NULL");
  }
  if (!columns.includes("map_url")) {
    // Optional Google Maps link. Existing rows stay '' (no map link); nothing is invented.
    db.exec("ALTER TABLE firms ADD COLUMN map_url TEXT NOT NULL DEFAULT ''");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS firms_slug ON firms (slug)");
  backfillFirmSlugs(db);
  // Categories (slug = the public address segment, e.g. su-yumusatma-cihazi). No display name is stored yet.
  // firm_categories links firms to categories many-to-many: a firm may sit in several categories.
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      slug       TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      name       TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS firm_categories (
      firm_id       INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
      category_slug TEXT NOT NULL REFERENCES categories(slug),
      PRIMARY KEY (firm_id, category_slug)
    );
    CREATE INDEX IF NOT EXISTS firm_categories_category ON firm_categories (category_slug, firm_id);
    -- Editable page texts per category. city_slug '' = the category page itself; a city slug = the
    -- category+city page. meta_title / meta_description: '' = built-in default. Tokens are expanded at render time.
    CREATE TABLE IF NOT EXISTS page_seo (
      category_slug    TEXT NOT NULL REFERENCES categories(slug),
      city_slug        TEXT NOT NULL DEFAULT '',
      meta_title       TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (category_slug, city_slug)
    );
    CREATE TABLE IF NOT EXISTS page_faqs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      category_slug TEXT NOT NULL REFERENCES categories(slug),
      city_slug     TEXT NOT NULL DEFAULT '',
      question      TEXT NOT NULL,
      answer        TEXT NOT NULL,
      position      INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS page_faqs_scope ON page_faqs (category_slug, city_slug, position);
  `);
  // Display name of a category ("Su Yumuşatma Cihazı"); the page texts are built from it. '' = read the address as words.
  const categoryColumns = (db.prepare("PRAGMA table_info(categories)").all() as { name: string }[]).map((c) => c.name);
  if (!categoryColumns.includes("name")) {
    db.exec("ALTER TABLE categories ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  }
  db.prepare("UPDATE categories SET name = ? WHERE slug = ? AND name = ''").run(MAIN_CATEGORY_NAME, CATEGORY_SLUG);
  removeLegacyMobileBanner(db);
}

/**
 * Gives every firm without a slug its address, oldest record first (so the oldest firm of a duplicated
 * name keeps the plain name). Drafts get one too: the address is fixed once and never changes when the
 * name is edited. Idempotent: rows that already have a slug are not touched.
 */
function backfillFirmSlugs(db: DatabaseSync) {
  const pending = db.prepare("SELECT id, name FROM firms WHERE slug IS NULL ORDER BY id").all() as { id: number; name: string }[];
  if (pending.length === 0) return;
  const exists = db.prepare("SELECT 1 FROM firms WHERE slug = ?");
  const assign = db.prepare("UPDATE firms SET slug = ? WHERE id = ?");
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const firm of pending) {
      assign.run(uniqueFirmSlug(String(firm.name), Number(firm.id), (slug) => exists.get(slug) !== undefined), firm.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * The mobile banner slot no longer exists: delete its row and its image (data/banners/mobil-<hex>.<ext>).
 * Idempotent; the old CHECK constraint of existing databases is left alone (nothing can insert 'mobil' any more).
 */
function removeLegacyMobileBanner(db: DatabaseSync) {
  const dir = path.join(path.dirname(databaseFile()), "banners");
  const named = db.prepare("SELECT file FROM banners WHERE slot = 'mobil'").all() as { file: string | null }[];
  db.prepare("DELETE FROM banners WHERE slot = 'mobil'").run();
  const names = new Set<string>(named.map((r) => r.file ?? ""));
  try {
    for (const entry of readdirSync(dir)) if (/^mobil-[0-9a-f]{16}\.(?:png|jpg|webp)$/.test(entry)) names.add(entry);
  } catch { /* no banner folder */ }
  for (const name of names) {
    if (!/^mobil-[0-9a-f]{16}\.(?:png|jpg|webp)$/.test(name)) continue;
    try { unlinkSync(path.join(dir, name)); } catch { /* already gone */ }
  }
}

/**
 * First run only: writes the 81 provinces of lib/cities.ts. A marker in app_meta makes this happen
 * exactly once, so a city deleted in the panel is never silently brought back on the next start.
 */
/** The FAQ already shown on every city page (app/home.json). Copied once so the panel can revise it. */
export const DESIGN_FAQS: readonly (readonly [string, string])[] = [
  ["Firmalardan nasıl teklif alabilirim?", "İlgilendiğiniz firmanın profil sayfasındaki teklif formunu doldurun. Talebiniz doğrudan firmaya iletilir."],
  ["Firmaların sıralaması neye göre belirleniyor?", "Firmalar ilan gruplarına göre listelenir ve her grup içindeki sıra belirli aralıklarla döner."],
  ["Firmamı rehbere nasıl ekletebilirim?", "İletişim sayfasındaki Firma Başvuru Formunu doldurun. Başvurunuz incelendikten sonra sizinle iletişime geçilir."],
  ["Teklif talebi göndermek ücretli mi?", "Hayır. Ziyaretçiler firmalara ücretsiz teklif talebi gönderebilir."],
];

export function seedDesignFaqs(db: DatabaseSync) {
  const cities = db.prepare("SELECT slug FROM cities").all() as { slug: string }[];
  const count = db.prepare("SELECT COUNT(*) AS n FROM city_faqs WHERE city_slug = ?");
  const insert = db.prepare("INSERT INTO city_faqs (city_slug, question, answer, position) VALUES (?, ?, ?, ?)");
  for (const city of cities) {
    const row = count.get(city.slug) as { n: number };
    if (Number(row.n) > 0) continue;
    DESIGN_FAQS.forEach(([question, answer], index) => insert.run(city.slug, question, answer, index + 1));
  }
}

function seedCities(db: DatabaseSync) {
  const seeded = db.prepare("SELECT 1 FROM app_meta WHERE key = 'cities_seeded'").get();
  if (seeded) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    const now = new Date().toISOString();
    const insert = db.prepare("INSERT OR IGNORE INTO cities (slug, name, created_at) VALUES (?, ?, ?)");
    for (const city of CITIES) insert.run(city.slug, city.name, now);
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('cities_seeded', ?)").run(now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * First run of this version only: registers the current category (CATEGORY_SLUG) and links every
 * existing firm to it, so the firms already published stay on /su-yumusatma-cihazi. A marker in app_meta
 * makes this happen exactly once, so a link removed later is never silently brought back.
 */
function seedCategories(db: DatabaseSync) {
  const seeded = db.prepare("SELECT 1 FROM app_meta WHERE key = 'firm_categories_seeded'").get();
  if (seeded) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO categories (slug, created_at, name) VALUES (?, ?, ?)").run(CATEGORY_SLUG, now, MAIN_CATEGORY_NAME);
    db.prepare("INSERT OR IGNORE INTO firm_categories (firm_id, category_slug) SELECT id, ? FROM firms").run(CATEGORY_SLUG);
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('firm_categories_seeded', ?)").run(now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * Once: the city texts written before categories existed (cities.meta_*, city_faqs) become the
 * category+city texts of the current category (page_seo / page_faqs), and the category page gets the
 * design's FAQ to edit. The old columns/tables are left untouched. A marker makes this run exactly once,
 * so a question deleted in the panel is never brought back.
 */
function seedPageTexts(db: DatabaseSync) {
  const seeded = db.prepare("SELECT 1 FROM app_meta WHERE key = 'page_texts_seeded'").get();
  if (seeded) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    seedDesignFaqs(db); // make sure every city still has its (design) questions before they are copied
    const now = new Date().toISOString();
    db.prepare(
      `INSERT OR IGNORE INTO page_seo (category_slug, city_slug, meta_title, meta_description)
       SELECT ?, slug, meta_title, meta_description FROM cities WHERE meta_title <> '' OR meta_description <> ''`,
    ).run(CATEGORY_SLUG);
    db.prepare(
      `INSERT INTO page_faqs (category_slug, city_slug, question, answer, position)
       SELECT ?, city_slug, question, answer, position FROM city_faqs ORDER BY city_slug, position, id`,
    ).run(CATEGORY_SLUG);
    const insert = db.prepare("INSERT INTO page_faqs (category_slug, city_slug, question, answer, position) VALUES (?, '', ?, ?, ?)");
    DESIGN_FAQS.forEach(([question, answer], index) => insert.run(CATEGORY_SLUG, question, answer, index + 1));
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('page_texts_seeded', ?)").run(now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const normalizeText = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when `stored` is `legacy` as written (tokens) or as shown on a page (city name and a number in place of the tokens). */
function isLegacyText(stored: string, legacy: readonly string[], cityName: string): boolean {
  const text = normalizeText(stored);
  return legacy.some((pattern) => {
    const source = escapeRegExp(normalizeText(pattern))
      .replaceAll("\\[Şehir Adı\\]", () => escapeRegExp(cityName))
      .replaceAll("\\[Firma Sayısı\\]", () => "\\d+");
    return text === normalizeText(pattern) || new RegExp(`^${source}$`, "u").test(text);
  });
}

/**
 * Once: fills the page titles/descriptions with the built-in patterns (lib/cities.ts) so no page is left
 * empty. For every category (category page and every registered city's page):
 *   - no record, or an empty title/description  → the new pattern is stored;
 *   - a title/description still equal to the previous built-in text → moved to the new pattern;
 *   - anything else (written by hand in the panel) is left exactly as it is.
 * A marker in app_meta makes this run exactly once, so text saved in the panel afterwards (including a
 * deliberately emptied field, which means "use the built-in text") is never overwritten again.
 */
function seedPagePatterns(db: DatabaseSync) {
  const seeded = db.prepare("SELECT 1 FROM app_meta WHERE key = 'page_patterns_seeded'").get();
  if (seeded) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    const categories = db.prepare("SELECT slug, name FROM categories").all() as { slug: string; name: string }[];
    const cities = db.prepare("SELECT slug, name FROM cities").all() as { slug: string; name: string }[];
    const find = db.prepare("SELECT meta_title, meta_description FROM page_seo WHERE category_slug = ? AND city_slug = ?");
    const upsert = db.prepare(
      `INSERT INTO page_seo (category_slug, city_slug, meta_title, meta_description) VALUES (?, ?, ?, ?)
       ON CONFLICT (category_slug, city_slug) DO UPDATE SET meta_title = excluded.meta_title, meta_description = excluded.meta_description`,
    );
    for (const category of categories) {
      const displayName = categoryDisplayName(category.slug, category.name);
      const scopes = [{ slug: "", name: "" }, ...cities];
      for (const scope of scopes) {
        const isCity = scope.slug !== "";
        const title = isCity ? cityTitlePattern(displayName) : categoryTitlePattern(displayName);
        const description = isCity ? cityDescriptionPattern(displayName) : categoryDescriptionPattern(displayName);
        const legacyTitle = isCity ? LEGACY_PAGE_TEXTS.cityTitle : LEGACY_PAGE_TEXTS.categoryTitle;
        const legacyDescription = isCity ? LEGACY_PAGE_TEXTS.cityDescription : LEGACY_PAGE_TEXTS.categoryDescription;
        const row = find.get(category.slug, scope.slug) as { meta_title: string; meta_description: string } | undefined;
        const oldTitle = String(row?.meta_title ?? "");
        const oldDescription = String(row?.meta_description ?? "");
        const nextTitle = normalizeText(oldTitle) === "" || isLegacyText(oldTitle, legacyTitle, scope.name) ? title : oldTitle;
        const nextDescription = normalizeText(oldDescription) === "" || isLegacyText(oldDescription, legacyDescription, scope.name) ? description : oldDescription;
        if (!row || nextTitle !== oldTitle || nextDescription !== oldDescription) upsert.run(category.slug, scope.slug, nextTitle, nextDescription);
      }
    }
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('page_patterns_seeded', ?)").run(new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function prepareDb(db: DatabaseSync) {
  migrate(db);
  seedCities(db);
  seedCategories(db);
  seedPageTexts(db);
  seedPagePatterns(db);
}

export function getDb(): DatabaseSync {
  if (globalForDb.__listeDb) {
    // A connection opened by an older build of this module (e.g. a running server) never saw the
    // newer schema: bring it up to date once, in place, without reopening or restarting anything.
    if (globalForDb.__listeSchema !== SCHEMA_VERSION) {
      prepareDb(globalForDb.__listeDb);
      globalForDb.__listeSchema = SCHEMA_VERSION;
    }
    return globalForDb.__listeDb;
  }

  const file = databaseFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS firms (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      city         TEXT NOT NULL DEFAULT 'Ankara',
      phone        TEXT NOT NULL DEFAULT '',
      email        TEXT NOT NULL DEFAULT '',
      address      TEXT NOT NULL DEFAULT '',
      whatsapp     TEXT NOT NULL DEFAULT '',
      website      TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      published_at TEXT
    );
    CREATE INDEX IF NOT EXISTS firms_city_status ON firms (city, status);
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      firm TEXT NOT NULL,
      subject TEXT NOT NULL,
      incident_date TEXT NOT NULL,
      description TEXT NOT NULL,
      received_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS firm_applications (
      id INTEGER PRIMARY KEY,
      firm TEXT NOT NULL,
      city TEXT NOT NULL,
      contact TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      description TEXT NOT NULL,
      received_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS application_firms (
      application_id INTEGER PRIMARY KEY REFERENCES firm_applications(id),
      firm_id INTEGER NOT NULL UNIQUE REFERENCES firms(id)
    );
    -- "Bu Profili Sahiplen" / "Firmayı Kaldır" requests from public profiles (lib/firm-requests.ts).
    -- Review-only: nothing here changes a firm row. firm_name is a snapshot taken at submission.
    CREATE TABLE IF NOT EXISTS firm_requests (
      id           INTEGER PRIMARY KEY,
      firm_id      INTEGER NOT NULL,
      firm_name    TEXT NOT NULL,
      request_type TEXT NOT NULL CHECK (request_type IN ('sahiplen', 'kaldir')),
      report_type  TEXT NOT NULL DEFAULT '',
      name         TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT '',
      phone        TEXT NOT NULL DEFAULT '',
      email        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      received_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS firm_requests_firm ON firm_requests (firm_id);
    -- Cities (lib/city-store.ts): source of truth for the firm form, validation and public city pages.
    -- meta_title / meta_description: '' = use the built-in default text. name matches firms.city.
    CREATE TABLE IF NOT EXISTS cities (
      slug             TEXT PRIMARY KEY,
      name             TEXT NOT NULL UNIQUE,
      meta_title       TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      created_at       TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS city_faqs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      city_slug TEXT NOT NULL REFERENCES cities(slug) ON DELETE CASCADE,
      question  TEXT NOT NULL,
      answer    TEXT NOT NULL,
      position  INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS city_faqs_city ON city_faqs (city_slug, position);
    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    -- Banner slots of the public design (lib/banners.ts). No row = the design's placeholder stays.
    -- file is a generated name inside data/banners (never a path from user input).
    CREATE TABLE IF NOT EXISTS banners (
      slot       TEXT PRIMARY KEY CHECK (slot IN ('liste', 'yan')),
      file       TEXT,
      mime       TEXT,
      alt        TEXT NOT NULL DEFAULT '',
      link       TEXT NOT NULL DEFAULT '',
      enabled    INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
      updated_at TEXT NOT NULL
    );
  `);
  prepareDb(db);
  globalForDb.__listeDb = db;
  globalForDb.__listeSchema = SCHEMA_VERSION;
  return db;
}
