import { getDb } from "./db";
import { CATEGORY_SLUG, DEFAULT_CITY } from "./cities";
import { isSupportedCity, listCities } from "./city-store";
import { isPackageLevel, type PackageLevel } from "./packages";
import { FIRM_SLUG_PATTERN, uniqueFirmSlug } from "./firm-slug";

export { PACKAGE_LEVELS, NO_PACKAGE_LABEL, isPackageLevel, packageLabel, type PackageLevel } from "./packages";

/** City choices: the registered cities in SQLite (seeded with the 81 provinces; the panel can add/remove). */
export function supportedCities(): string[] {
  return listCities().map((city) => city.name);
}

export type FirmStatus = "draft" | "published";

export type FirmInput = {
  name: string;
  city: string;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  website: string;
  /** Optional Google Maps link; "" = none. */
  mapUrl: string;
  shortDescription: string;
  /** "" = no package assigned. */
  packageLevel: PackageLevel | "";
};

export type Firm = FirmInput & {
  id: number;
  /** Public address segment (/firmalar/<slug>); assigned once, kept when the name is edited. */
  slug: string;
  status: FirmStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type FieldErrors = Partial<Record<keyof FirmInput, string>>;

export const FIELD_LABELS: Record<keyof FirmInput, string> = {
  name: "Firma adı",
  city: "Şehir",
  phone: "Telefon",
  email: "E-posta",
  address: "Adres",
  whatsapp: "WhatsApp",
  website: "Web sitesi",
  mapUrl: "Harita",
  shortDescription: "Kısa tanıtım",
  packageLevel: "Paket",
};

const MAX_LENGTH: Record<keyof FirmInput, number> = {
  name: 120,
  city: 40,
  phone: 30,
  email: 254,
  address: 300,
  whatsapp: 30,
  website: 300,
  mapUrl: 500,
  shortDescription: 300,
  packageLevel: 20,
};

/* ---------- normalisation helpers ---------- */

function cleanText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turkish landline/mobile (10 digits) or 444 numbers. Returns display format or null. */
export function normalizeTrPhone(input: string, mobileOnly = false): string | null {
  if (!/^[\d\s()+\-.]+$/.test(input)) return null;
  let digits = input.replace(/\D/g, "");
  if (!mobileOnly && /^444\d{4}$/.test(digits)) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  }
  if (input.trim().startsWith("+")) {
    if (!digits.startsWith("90")) return null;
    digits = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith("90")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  const pattern = mobileOnly ? /^5\d{9}$/ : /^[2-58]\d{9}$/;
  if (!pattern.test(digits)) return null;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

/** Digits in international form, e.g. "903121234567" (or "4441234"). */
export function phoneDigits(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return "90" + digits.slice(1);
  return digits;
}

export function normalizeEmail(input: string): string | null {
  const email = input.toLowerCase();
  if (email.length > 254) return null;
  if (!/^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\.]{2,}$/.test(email)) return null;
  return email;
}

export function normalizeWebsite(input: string): string | null {
  let value = input;
  if (!/^https?:\/\//i.test(value)) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null; // ftp://, javascript:// …
    value = "https://" + value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!/^[^.]+(\.[^.]+)+$/.test(url.hostname)) return null;
  return url.toString();
}

/** Google Maps link: known Google Maps hosts only. Returns the normalised https URL or null. */
export function normalizeMapUrl(input: string): string | null {
  const value = /^https?:\/\//i.test(input) ? input : "https://" + input;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  // Google country suffixes only: com, xx (ccTLD), co.xx, com.xx — never arbitrary trailing labels.
  const gSuffix = "(?:com|[a-z]{2}|co\\.[a-z]{2}|com\\.[a-z]{2})";
  const isGoogle = new RegExp(`^(?:www\\.)?google\\.${gSuffix}$`).test(host) && path.startsWith("/maps");
  const isMapsHost = new RegExp(`^maps\\.google\\.${gSuffix}$`).test(host);
  const isShort = host === "maps.app.goo.gl" || host === "g.page" || (host === "goo.gl" && path.startsWith("/maps"));
  if (!isGoogle && !isMapsHost && !isShort) return null;
  url.protocol = "https:";
  return url.toString();
}

/* ---------- validation ---------- */

export type ValidationMode = "draft" | "publish";

/**
 * Server-side validation. Drafts only need a name; every filled field is still
 * format-checked. The city must always be a registered city (SQLite `cities`, lib/city-store.ts).
 * Publishing additionally requires phone, email
 * and address. WhatsApp, website and the short introduction are always optional.
 */
export function validateFirm(raw: Record<string, unknown>, mode: ValidationMode) {
  // Package: server-side allow-list. Empty = no package (allowed in every mode; not a publish requirement).
  const rawPackage = cleanText(raw.packageLevel);
  const values: FirmInput = {
    name: cleanText(raw.name),
    city: cleanText(raw.city) || DEFAULT_CITY,
    phone: cleanText(raw.phone),
    email: cleanText(raw.email),
    address: cleanText(raw.address),
    whatsapp: cleanText(raw.whatsapp),
    website: cleanText(raw.website),
    mapUrl: cleanText(raw.mapUrl),
    shortDescription: cleanText(raw.shortDescription),
    packageLevel: isPackageLevel(rawPackage) ? rawPackage : "",
  };
  const errors: FieldErrors = {};

  for (const key of Object.keys(values) as (keyof FirmInput)[]) {
    if (values[key].length > MAX_LENGTH[key]) {
      errors[key] = `${FIELD_LABELS[key]} en fazla ${MAX_LENGTH[key]} karakter olabilir.`;
    }
  }

  if (!errors.name && values.name.length < 2) errors.name = "Firma adı en az 2 karakter olmalı.";

  if (rawPackage && !isPackageLevel(rawPackage)) {
    errors.packageLevel = "Geçersiz paket seçimi. Listeden bir paket seçin veya “Paket atanmadı” bırakın.";
  }

  if (!errors.city && !isSupportedCity(values.city)) {
    errors.city = "Listeden geçerli bir şehir seçin.";
  }

  if (!errors.phone && values.phone) {
    const phone = normalizeTrPhone(values.phone);
    if (phone) values.phone = phone;
    else errors.phone = "Geçerli bir Türkiye telefon numarası girin (ör. 0312 123 45 67).";
  }

  if (!errors.email && values.email) {
    const email = normalizeEmail(values.email);
    if (email) values.email = email;
    else errors.email = "Geçerli bir e-posta adresi girin.";
  }

  if (!errors.whatsapp && values.whatsapp) {
    const whatsapp = normalizeTrPhone(values.whatsapp, true);
    if (whatsapp) values.whatsapp = whatsapp;
    else errors.whatsapp = "Geçerli bir cep telefonu numarası girin (ör. 0532 123 45 67).";
  }

  if (!errors.website && values.website) {
    const website = normalizeWebsite(values.website);
    if (website) values.website = website;
    else errors.website = "Geçerli bir web adresi girin (ör. www.firma.com.tr).";
  }

  // Optional in every mode (never a publish requirement); only a filled value is checked.
  if (!errors.mapUrl && values.mapUrl) {
    const mapUrl = normalizeMapUrl(values.mapUrl);
    if (mapUrl) values.mapUrl = mapUrl;
    else errors.mapUrl = "Geçerli bir Google Maps bağlantısı girin (ör. https://maps.app.goo.gl/…).";
  }

  if (mode === "publish") {
    if (!errors.phone && !values.phone) errors.phone = "Yayınlamak için telefon zorunlu.";
    if (!errors.email && !values.email) errors.email = "Yayınlamak için e-posta zorunlu.";
    if (!errors.address && values.address.length < 10) {
      errors.address = values.address
        ? "Adres en az 10 karakter olmalı."
        : "Yayınlamak için adres zorunlu.";
    }
  }

  return { values, errors, valid: Object.keys(errors).length === 0 };
}

/* ---------- queries ---------- */

type Row = Record<string, unknown>;

function toFirm(row: Row): Firm {
  const storedPackage = row.package_level;
  return {
    id: Number(row.id),
    slug: String(row.slug ?? ""),
    name: String(row.name),
    city: String(row.city),
    phone: String(row.phone),
    email: String(row.email),
    address: String(row.address),
    whatsapp: String(row.whatsapp),
    website: String(row.website),
    mapUrl: String(row.map_url ?? ""),
    shortDescription: String(row.short_description ?? ""),
    // NULL (pre-package records) or anything outside the allow-list reads as "no package".
    packageLevel: isPackageLevel(storedPackage) ? storedPackage : "",
    status: row.status === "published" ? "published" : "draft",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    publishedAt: row.published_at == null ? null : String(row.published_at),
  };
}

export function parseId(value: unknown): number | null {
  const text = String(value ?? "");
  if (!/^\d{1,10}$/.test(text)) return null;
  const id = Number(text);
  return id > 0 ? id : null;
}

export function listFirms(): Firm[] {
  const rows = getDb().prepare("SELECT * FROM firms ORDER BY updated_at DESC, id DESC").all() as Row[];
  return rows.map(toFirm);
}

const byName = (a: Firm, b: Firm) => a.name.localeCompare(b.name, "tr");

export function listPublishedFirms(city: string): Firm[] {
  const rows = getDb()
    .prepare("SELECT * FROM firms WHERE status = 'published' AND city = ?")
    .all(city) as Row[];
  return rows.map(toFirm).sort(byName);
}

/** Every published firm, all cities (homepage). Same ordering as the city lists. */
export function listAllPublishedFirms(): Firm[] {
  const rows = getDb().prepare("SELECT * FROM firms WHERE status = 'published'").all() as Row[];
  return rows.map(toFirm).sort(byName);
}

/**
 * Published firms linked to a category (firm_categories), all cities, same ordering as above.
 * The public category and city lists use this: the category decides which firms are listed.
 */
export function listPublishedFirmsInCategory(categorySlug: string): Firm[] {
  const rows = getDb()
    .prepare(
      `SELECT f.* FROM firms f
       WHERE f.status = 'published'
         AND EXISTS (SELECT 1 FROM firm_categories fc WHERE fc.firm_id = f.id AND fc.category_slug = ?)`,
    )
    .all(categorySlug) as Row[];
  return rows.map(toFirm).sort(byName);
}

/** Category slugs for every firm, for the firm-list filters. */
export function listFirmCategoryIndex(): Map<number, Set<string>> {
  const rows = getDb().prepare("SELECT firm_id, category_slug FROM firm_categories").all() as { firm_id: number; category_slug: string }[];
  const index = new Map<number, Set<string>>();
  for (const row of rows) {
    const id = Number(row.firm_id);
    const slugs = index.get(id) ?? new Set<string>();
    slugs.add(String(row.category_slug));
    index.set(id, slugs);
  }
  return index;
}

/** Category slugs a firm is linked to (a firm may have several). */
export function listFirmCategories(firmId: number): string[] {
  const rows = getDb()
    .prepare("SELECT category_slug FROM firm_categories WHERE firm_id = ? ORDER BY category_slug")
    .all(firmId) as Row[];
  return rows.map((row) => String(row.category_slug));
}

export function getFirm(id: number): Firm | null {
  const row = getDb().prepare("SELECT * FROM firms WHERE id = ?").get(id) as Row | undefined;
  return row ? toFirm(row) : null;
}

/**
 * Public lookup for the profile page: the same record the lists render, but only while published.
 * Drafts and unknown ids both return null (the page answers 404 for either, so a visitor cannot
 * tell them apart). Temporary rule until an archive policy is decided.
 */
export function getPublishedFirm(id: number): Firm | null {
  const row = getDb()
    .prepare("SELECT * FROM firms WHERE id = ? AND status = 'published'")
    .get(id) as Row | undefined;
  return row ? toFirm(row) : null;
}

/**
 * Public routes under /firmalar/<slug>: exact slug only (case variants, encoded text and unknown
 * slugs → null), published firms only. Shared by the profile page and its request forms so they
 * answer 404 for exactly the same addresses.
 */
export function getPublishedFirmBySlug(raw: string): Firm | null {
  if (!FIRM_SLUG_PATTERN.test(raw)) return null;
  const row = getDb().prepare("SELECT * FROM firms WHERE slug = ? AND status = 'published'").get(raw) as Row | undefined;
  return row ? toFirm(row) : null;
}

/**
 * Old address /firma/<number>: canonical ids only ("012", "1abc" → null), published firms only.
 * Used just to redirect to the slug address.
 */
export function getPublishedFirmByParam(raw: string): Firm | null {
  const id = parseId(raw);
  return id !== null && String(id) === raw ? getPublishedFirm(id) : null;
}

/** Public profile URL of a firm: /firmalar/<slug>. */
export function firmProfilePath(firm: { slug: string }): string {
  return `/firmalar/${firm.slug}`;
}

/**
 * Replaces the firm's categories with exactly `slugs` (callers pass only registered categories).
 * An empty list is allowed: the firm then belongs to no category and is listed nowhere.
 */
export function setFirmCategories(firmId: number, slugs: readonly string[]): void {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM firm_categories WHERE firm_id = ?").run(firmId);
    const insert = db.prepare("INSERT OR IGNORE INTO firm_categories (firm_id, category_slug) VALUES (?, ?)");
    for (const slug of slugs) insert.run(firmId, slug);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** `categories` defaults to the current category (used by callers without a picker, e.g. application drafts). */
export function createFirm(values: FirmInput, status: FirmStatus, categories: readonly string[] = [CATEGORY_SLUG]): number {
  const now = new Date().toISOString();
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    // The record number is only the fallback for a name with no usable characters: AUTOINCREMENT, so max(id)+1 is next.
    const seq = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'firms'").get() as { seq: number } | undefined;
    const exists = db.prepare("SELECT 1 FROM firms WHERE slug = ?");
    const slug = uniqueFirmSlug(values.name, Number(seq?.seq ?? 0) + 1, (candidate) => exists.get(candidate) !== undefined);
    const result = db
      .prepare(
        `INSERT INTO firms (name, slug, city, phone, email, address, whatsapp, website, map_url, short_description, package_level, status, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        values.name, slug, values.city, values.phone, values.email, values.address, values.whatsapp, values.website,
        values.mapUrl, values.shortDescription, packageColumn(values.packageLevel), status, now, now, status === "published" ? now : null,
      );
    const id = Number(result.lastInsertRowid);
    const link = db.prepare("INSERT OR IGNORE INTO firm_categories (firm_id, category_slug) VALUES (?, ?)");
    for (const slug of categories) link.run(id, slug);
    db.exec("COMMIT");
    return id;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function updateFirm(id: number, values: FirmInput, status: FirmStatus): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE firms SET name = ?, city = ?, phone = ?, email = ?, address = ?, whatsapp = ?, website = ?, map_url = ?,
         short_description = ?, package_level = ?, status = ?, updated_at = ?,
         published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE NULL END
       WHERE id = ?`,
    )
    .run(
      values.name, values.city, values.phone, values.email, values.address, values.whatsapp, values.website,
      values.mapUrl, values.shortDescription, packageColumn(values.packageLevel), status, now, status, now, id,
    );
}

/** DB value for a package: allow-listed slug or NULL (no package). Re-checked here as a last guard. */
function packageColumn(value: unknown): PackageLevel | null {
  return isPackageLevel(value) ? value : null;
}

export function setFirmStatus(id: number, status: FirmStatus): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE firms SET status = ?, updated_at = ?,
         published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE NULL END
       WHERE id = ?`,
    )
    .run(status, now, status, now, id);
}

export function deleteDraftFirm(id: number): boolean {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM application_firms WHERE firm_id = ? AND EXISTS (SELECT 1 FROM firms WHERE id = ? AND status = 'draft')").run(id, id);
    const deleted = db.prepare("DELETE FROM firms WHERE id = ? AND status = 'draft'").run(id);
    db.exec("COMMIT");
    return deleted.changes === 1;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
