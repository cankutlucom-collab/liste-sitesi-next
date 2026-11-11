import type { Firm } from "./firms";
import type { PackageLevel } from "./packages";

/*
 * Public listing package rotation (pure functions: no database, no design template, no clock
 * unless `now` is omitted). Rules confirmed for this stage:
 *  - Homepage: at most 3 Altın, 5 Gümüş, 5 Bronz (all cities), with Ekonomik filling
 *    the initial list up to 16 cards in a separate block.
 *  - City page: at most 3 / 5 / 5 of that city's Altın / Gümüş / Bronz; Ekonomik fills
 *    the initial list up to 16 cards, with the remainder revealed on demand.
 *  - Each tier group rotates cyclically one position at every Istanbul 3-hour boundary
 *    (00:00, 03:00, … 21:00 Europe/Istanbul); the same slot always gives the same order.
 *  - A quota is never filled from another package, no firm appears twice, firms without a
 *    package are not listed (their profile page is unaffected).
 */

export const ROTATION_TIME_ZONE = "Europe/Istanbul";
export const ROTATION_PERIOD_HOURS = 3;
const PERIOD_MS = ROTATION_PERIOD_HOURS * 60 * 60 * 1000;

const PAID_LIMIT = { altin: 3, gumus: 5, bronz: 5 } as const;
const INITIAL_TOTAL = 16;
/** Each "Daha fazla gör" click reveals up to this many additional cards. */
export const REVEAL_STEP = 8;

export type PaidTier = keyof typeof PAID_LIMIT;

/**
 * Test hook: LISTE_ROTATION_NOW (any Date-parsable value, e.g. "2026-11-10T09:00:00+03:00")
 * pins the clock used for rotation. Unset or invalid = real time.
 */
export function rotationNow(): Date {
  const pinned = process.env.LISTE_ROTATION_NOW;
  if (pinned) {
    const date = new Date(pinned);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

const istanbulParts = new Intl.DateTimeFormat("en-US", {
  timeZone: ROTATION_TIME_ZONE,
  year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  hourCycle: "h23",
});

/**
 * Rotation slot: number of whole 3-hour periods of Istanbul wall-clock time since 1970-01-01 00:00
 * (Istanbul). Advances by exactly 1 at 00:00, 03:00, …, 21:00 Istanbul time and is constant in between.
 * Uses the IANA zone (not a hard-coded +03:00) so a future offset change is still handled.
 */
export function rotationSlot(now: Date): number {
  const parts: Record<string, number> = {};
  for (const part of istanbulParts.formatToParts(now)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wallClockMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  return Math.floor(wallClockMs / PERIOD_MS);
}

/** Cyclic left shift by `slot` positions: slot 0 = base order, slot 1 = second item first, … */
export function rotate<T>(items: readonly T[], slot: number): T[] {
  const n = items.length;
  if (n === 0) return [];
  const k = ((slot % n) + n) % n;
  return items.slice(k).concat(items.slice(0, k));
}

/**
 * Stable base order of a group: record id ascending (creation order). The id never changes,
 * so editing a firm does not reorder its group, and adding/removing a member keeps the cyclic
 * order of all other members. (The starting position is slot mod group size, so it can move
 * when the group size changes; keeping it fixed would need stored rotation state.)
 */
function byId(a: Firm, b: Firm): number {
  return a.id - b.id;
}

/** Published firms of one package, deduplicated by id, in base order, rotated for `slot`. */
function rotatedGroup(firms: readonly Firm[], level: PackageLevel, slot: number): Firm[] {
  const seen = new Set<number>();
  const members = firms
    .filter((firm) => firm.status === "published" && firm.packageLevel === level)
    .filter((firm) => (seen.has(firm.id) ? false : (seen.add(firm.id), true)))
    .sort(byId);
  return rotate(members, slot);
}

export type TierSplit = { initial: Firm[]; extra: Firm[] };

export type ListingPlan = {
  slot: number;
  paid: Record<PaidTier, Firm[]>;
  /** Ekonomik fills the remaining places up to 16 cards. */
  ekonomik: TierSplit;
};

function split(group: Firm[], quota: number): TierSplit {
  return { initial: group.slice(0, quota), extra: group.slice(quota) };
}

function planListing(firms: readonly Firm[], economy: Firm[], slot: number): ListingPlan {
  const paid = {
    altin: rotatedGroup(firms, "altin", slot).slice(0, PAID_LIMIT.altin),
    gumus: rotatedGroup(firms, "gumus", slot).slice(0, PAID_LIMIT.gumus),
    bronz: rotatedGroup(firms, "bronz", slot).slice(0, PAID_LIMIT.bronz),
  };
  const paidCount = paid.altin.length + paid.gumus.length + paid.bronz.length;
  return { slot, paid, ekonomik: split(economy, INITIAL_TOTAL - paidCount) };
}

/** Homepage: all cities; every tier group (including Ekonomik) rotates on its own. */
export function planHomeListing(allPublished: readonly Firm[], slot: number): ListingPlan {
  return planListing(allPublished, rotatedGroup(allPublished, "ekonomik", slot), slot);
}

/**
 * City page: Altın / Gümüş / Bronz are the city's own groups (rotated by the city group size);
 * Ekonomik is the global rotated order with other cities' firms removed.
 */
export function planCityListing(allPublished: readonly Firm[], city: string, slot: number): ListingPlan {
  const inCity = (firm: Firm) => firm.city === city;
  return planListing(allPublished.filter(inCity), rotatedGroup(allPublished, "ekonomik", slot).filter(inCity), slot);
}
