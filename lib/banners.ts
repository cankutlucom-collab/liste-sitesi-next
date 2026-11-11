import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "./db";
import { escapeHtml } from "./listing";

/*
 * Admin-managed banners for the two fixed slots of the homepage design (app/home.json):
 *   liste div.s50                (between Gümüş and Bronz in the list, 1152 x 120)
 *   yan    div.s59 in the aside   (300 x 250)
 *
 * app/home.json is never rewritten. applyBanners() swaps the inside of these blocks at request time,
 * only for a slot that is enabled and has an image; otherwise the design's placeholder text stays.
 * The outer element and its class are kept, so the layout (heights, mobile/desktop visibility) is unchanged.
 * Images live in data/banners (outside public/) and are served by app/banner-gorsel/[slot]/route.ts.
 */

export const BANNER_SLOTS = [
  { key: "liste", label: "Liste İçi Banner", size: "1152 × 120", width: 1152, height: 120, note: "Listede Gümüş ile Bronz arasında, 8. karttan sonra." },
  { key: "yan", label: "Yan Alan Banner", size: "300 × 250", width: 300, height: 250, note: "Masaüstünde yan alanda görünür." },
] as const;

export type BannerSlot = (typeof BANNER_SLOTS)[number]["key"];

export function isBannerSlot(value: string): value is BannerSlot {
  return BANNER_SLOTS.some((slot) => slot.key === value);
}

export const BANNER_LIMITS = { bytes: 1024 * 1024, alt: 140, link: 500 } as const;

export const BANNER_ERRORS = {
  "slot": "Geçersiz banner alanı.",
  "dosya-buyuk": "Görsel en fazla 1 MB olabilir.",
  "dosya-tur": "Görsel yalnızca png, jpeg veya webp olabilir (dosya içeriği kontrol edilir).",
  "alt-uzun": `Alternatif metin en fazla ${BANNER_LIMITS.alt} karakter olabilir.`,
  "alt-zorunlu": "Yayındaki görsel için alternatif metin zorunludur.",
  "gorsel-yok": "Yayına açmak için önce bir görsel yükleyin.",
  "baglanti": "Bağlantı boş olabilir; doluysa http://, https:// ile veya / ile başlayan bir site içi yol olmalıdır.",
  "baglanti-uzun": `Bağlantı en fazla ${BANNER_LIMITS.link} karakter olabilir.`,
  "istek": "İstek okunamadı veya çok büyük.",
  "kayit": "Kayıt yapılamadı; lütfen tekrar deneyin.",
} as const;

export type BannerErrorCode = keyof typeof BANNER_ERRORS;

export function isBannerError(value: string): value is BannerErrorCode {
  return Object.hasOwn(BANNER_ERRORS, value);
}

export type BannerRow = {
  slot: BannerSlot;
  file: string | null;
  mime: string | null;
  alt: string;
  link: string;
  enabled: boolean;
  updatedAt: string;
};

type Row = Record<string, unknown>;

/* ---------- storage ---------- */

function bannerDir(): string {
  const dbFile = process.env.LISTE_DB_PATH || path.join(process.cwd(), "data", "liste.sqlite");
  return path.join(path.dirname(dbFile), "banners");
}

const FILE_NAME = /^(?:liste|yan)-[0-9a-f]{16}\.(?:png|jpg|webp)$/;

function filePath(name: string): string | null {
  return FILE_NAME.test(name) ? path.join(bannerDir(), name) : null;
}

function removeFile(name: string | null) {
  const target = name ? filePath(name) : null;
  if (!target) return;
  try { unlinkSync(target); } catch { /* already gone */ }
}

const toRow = (row: Row): BannerRow => ({
  slot: String(row.slot) as BannerSlot,
  file: row.file == null ? null : String(row.file),
  mime: row.mime == null ? null : String(row.mime),
  alt: String(row.alt ?? ""),
  link: String(row.link ?? ""),
  enabled: Number(row.enabled) === 1,
  updatedAt: String(row.updated_at ?? ""),
});

export function getBanner(slot: BannerSlot): BannerRow | null {
  const row = getDb().prepare("SELECT * FROM banners WHERE slot = ?").get(slot) as Row | undefined;
  return row ? toRow(row) : null;
}

/** Bytes and type of a slot's stored image, or null. */
export function readBannerImage(slot: BannerSlot): { bytes: Buffer; mime: string; enabled: boolean } | null {
  const row = getBanner(slot);
  const target = row?.file ? filePath(row.file) : null;
  if (!row || !target) return null;
  let bytes: Buffer;
  try { bytes = readFileSync(target); } catch { return null; }
  const type = sniffImage(bytes);
  return type ? { bytes, mime: type.mime, enabled: row.enabled } : null;
}

/* ---------- validation ---------- */

/** Image type from the file header (the browser-sent type and the file name are ignored). */
export function sniffImage(bytes: Uint8Array): { mime: string; ext: "png" | "jpg" | "webp" } | null {
  const at = (offset: number, ...values: number[]) => values.every((v, i) => bytes[offset + i] === v);
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: "image/png", ext: "png" };
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { mime: "image/webp", ext: "webp" };
  return null;
}

// Control and zero-width characters become spaces (built from code points to keep the source plain ASCII).
const CONTROL_CHARS = new RegExp(
  "[" + [[0x00, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x2029]]
    .map(([from, to]) => String.fromCharCode(from) + "-" + String.fromCharCode(to)).join("") + "]",
  "g",
);

export function cleanAlt(value: unknown): string {
  return String(value ?? "").normalize("NFC").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

/** Empty = no link. Otherwise only http(s) URLs or a site-internal path starting with a single "/". */
export function parseBannerLink(value: unknown): { ok: true; link: string } | { ok: false; code: BannerErrorCode } {
  const link = String(value ?? "").trim();
  if (link === "") return { ok: true, link };
  if (link.length > BANNER_LIMITS.link) return { ok: false, code: "baglanti-uzun" };
  if (/[\u0000- \u007f\\<>"'`]/.test(link)) return { ok: false, code: "baglanti" };
  if (link.startsWith("/")) {
    return link.startsWith("//") ? { ok: false, code: "baglanti" } : { ok: true, link };
  }
  if (!/^https?:\/\//i.test(link)) return { ok: false, code: "baglanti" };
  try {
    const url = new URL(link);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return { ok: false, code: "baglanti" };
  } catch {
    return { ok: false, code: "baglanti" };
  }
  return { ok: true, link };
}

/* ---------- admin writes ---------- */

export type BannerResult = { ok: true } | { ok: false; code: BannerErrorCode };

export function saveBanner(
  slot: BannerSlot,
  input: { alt: unknown; link: unknown; enabled: boolean; upload: Buffer | null },
): BannerResult {
  const alt = cleanAlt(input.alt);
  if (Array.from(alt).length > BANNER_LIMITS.alt) return { ok: false, code: "alt-uzun" };
  const link = parseBannerLink(input.link);
  if (!link.ok) return link;

  let type: ReturnType<typeof sniffImage> = null;
  if (input.upload) {
    if (input.upload.length > BANNER_LIMITS.bytes) return { ok: false, code: "dosya-buyuk" };
    type = sniffImage(input.upload);
    if (!type) return { ok: false, code: "dosya-tur" };
  }

  const existing = getBanner(slot);
  const hasImage = Boolean(type || existing?.file);
  if (input.enabled && !hasImage) return { ok: false, code: "gorsel-yok" };
  if (input.enabled && !alt) return { ok: false, code: "alt-zorunlu" };

  let newName: string | null = null;
  try {
    if (input.upload && type) {
      newName = `${slot}-${randomBytes(8).toString("hex")}.${type.ext}`;
      mkdirSync(bannerDir(), { recursive: true });
      writeFileSync(path.join(bannerDir(), newName), input.upload);
    }
    getDb().prepare(
      `INSERT INTO banners (slot, file, mime, alt, link, enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slot) DO UPDATE SET file = excluded.file, mime = excluded.mime, alt = excluded.alt,
         link = excluded.link, enabled = excluded.enabled, updated_at = excluded.updated_at`,
    ).run(
      slot,
      newName ?? existing?.file ?? null,
      type?.mime ?? existing?.mime ?? null,
      alt,
      link.link,
      input.enabled ? 1 : 0,
      new Date().toISOString(),
    );
  } catch {
    removeFile(newName);
    return { ok: false, code: "kayit" };
  }
  if (newName) removeFile(existing?.file ?? null);
  return { ok: true };
}

/** Removes image, text and link: the slot goes back to the design's placeholder. */
export function removeBanner(slot: BannerSlot): BannerResult {
  const existing = getBanner(slot);
  try {
    getDb().prepare("DELETE FROM banners WHERE slot = ?").run(slot);
  } catch {
    return { ok: false, code: "kayit" };
  }
  removeFile(existing?.file ?? null);
  return { ok: true };
}

/* ---------- public rendering ---------- */

function imageHtml(row: BannerRow, slot: (typeof BANNER_SLOTS)[number]): string {
  const version = Date.parse(row.updatedAt) || 0;
  const img = `<img src="/banner-gorsel/${slot.key}?v=${version}" alt="${escapeHtml(row.alt)}" width="${slot.width}" height="${slot.height}" decoding="async" style="display:block;width:100%;height:100%;object-fit:contain">`;
  if (!row.link) return img;
  const external = /^https?:\/\//i.test(row.link);
  const attrs = external ? ' target="_blank" rel="noopener nofollow"' : "";
  return `<a href="${escapeHtml(row.link)}"${attrs} style="display:block;width:100%;height:100%">${img}</a>`;
}

// The slot's outer element keeps its class (size, flex layout); only the dashed placeholder look is switched off.
const BARE = 'style="border:0;background:transparent;overflow:hidden"';

const MOBILE_BLOCK = /<div class="mobile-banner s26">\s*<div class="s27">[\s\S]*?<\/div>\s*<\/div>\s*/;

const SLOT_BLOCKS: Record<BannerSlot, { pattern: RegExp; render: (inner: string) => string }> = {
  liste: {
    pattern: /<div class="s50">[\s\S]*?<\/div>/,
    render: (inner) => `<div class="s50" ${BARE}>${inner}</div>`,
  },
  yan: {
    pattern: /<div class="s59">[\s\S]*?<\/div>/,
    render: (inner) => `<div class="s59" ${BARE}>${inner}</div>`,
  },
};

/**
 * Applies the enabled banners to the homepage design HTML (call on the template, before firm cards are
 * inserted). Any problem (no table row, missing file, database error) leaves the placeholder untouched.
 */
export function applyBanners(html: string): string {
  // The design's mobile banner block is not a banner slot any more: it is dropped from the published HTML.
  const stripped = html.replace(MOBILE_BLOCK, "");
  let rows: BannerRow[];
  try {
    rows = (getDb().prepare("SELECT * FROM banners WHERE enabled = 1").all() as Row[]).map(toRow);
  } catch {
    return stripped;
  }
  let result = stripped;
  for (const row of rows) {
    const slot = BANNER_SLOTS.find((s) => s.key === row.slot);
    const target = row.file ? filePath(row.file) : null;
    if (!slot || !target || !row.alt || !existsSync(target)) continue;
    const block = SLOT_BLOCKS[slot.key];
    const markup = block.render(imageHtml(row, slot));
    result = result.replace(block.pattern, () => markup);
  }
  return result;
}
