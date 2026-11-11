/**
 * Manually assigned package levels (admin only). Stored as these slugs in firms.package_level;
 * "" in code / NULL in the database means "no package assigned" (all records created before
 * packages existed). Assignment only: no payment, quota, dates, expiry or ordering effect yet.
 *
 * Kept free of server imports so the admin form (client component) can use it.
 * Keep the slugs in sync with the CHECK constraint in lib/db.ts.
 */
export const PACKAGE_LEVELS = [
  { value: "altin", label: "Altın" },
  { value: "gumus", label: "Gümüş" },
  { value: "bronz", label: "Bronz" },
  { value: "ekonomik", label: "Ekonomik" },
] as const;

export type PackageLevel = (typeof PACKAGE_LEVELS)[number]["value"];

export const NO_PACKAGE_LABEL = "Paket atanmadı";

export function isPackageLevel(value: unknown): value is PackageLevel {
  return PACKAGE_LEVELS.some((level) => level.value === value);
}

export function packageLabel(value: string): string {
  return PACKAGE_LEVELS.find((level) => level.value === value)?.label ?? NO_PACKAGE_LABEL;
}
