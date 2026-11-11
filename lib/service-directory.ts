import { getDb } from "./db";
import { categoryDisplayName } from "./cities";
import { isReservedSlug } from "./category-store";
import { listVisibleCities } from "./city-store";

/*
 * Data of the /hizmetler directory page. Nothing is listed by hand: every registered service (category)
 * that has a published firm shows up with its city pages, and a city appears only while it has a published
 * firm in that service (the same rule that makes /<service>/<city> exist). Server-only.
 */

export type ServiceGroup = {
  slug: string;
  name: string;
  path: string;
  cities: { slug: string; name: string; label: string; path: string }[];
};

export const SERVICES_PATH = "/hizmetler";

export function servicePagePath(slug: string): string {
  return `${SERVICES_PATH}/${slug}`;
}

/** One service with all its published cities, or null (unknown, reserved, or no published firm) -> 404. */
export function getServiceGroup(slug: string): ServiceGroup | null {
  return listServiceDirectory().find((group) => group.slug === slug) ?? null;
}

export function listServiceDirectory(): ServiceGroup[] {
  const rows = getDb().prepare("SELECT slug, name FROM categories").all() as Record<string, unknown>[];
  return rows
    .map((row) => ({ slug: String(row.slug), name: categoryDisplayName(String(row.slug), String(row.name)) }))
    .filter((category) => !isReservedSlug(category.slug))
    .map((category) => ({
      ...category,
      path: `/${category.slug}`,
      cities: listVisibleCities(category.slug)
        .sort((a, b) => a.name.localeCompare(b.name, "tr"))
        .map((city) => ({
          slug: city.slug,
          name: city.name,
          label: `${city.name} ${category.name}`,
          path: `/${category.slug}/${city.slug}`,
        })),
    }))
    .filter((group) => group.cities.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
