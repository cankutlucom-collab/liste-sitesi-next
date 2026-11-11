/*
 * Public firm address segment: /firmalar/<slug>. No imports (used by lib/db.ts and lib/firms.ts).
 * Same rule as the city slugs: lower case, hyphens, no Turkish characters. Digits are kept
 * (a firm called "3M Su" must not collapse to "m-su"). A second firm with the same name gets
 * the next number appended ("ornek-su", "ornek-su-2", "ornek-su-3"); no other word is added.
 */

export const FIRM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Çağlayan Su Arıtma A.Ş." → "caglayan-su-aritma-a-s". Empty string if nothing usable is left. */
export function slugifyFirm(name: string): string {
  return name
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * First free slug for a name. `isTaken` answers for slugs already used by other firms.
 * A name with no usable characters falls back to the record number (still no invented word).
 */
export function uniqueFirmSlug(name: string, fallbackNumber: number, isTaken: (slug: string) => boolean): string {
  const base = slugifyFirm(name) || String(fallbackNumber);
  if (!isTaken(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!isTaken(candidate)) return candidate;
  }
}
