import CityPage, { generateMetadata as cityMetadata } from "../[city]/page";

/*
 * Transitional: /firmalar/ankara is now served by the shared city route (app/firmalar/[city]).
 * This static segment would take precedence over [city], so it only delegates to it with the
 * "ankara" slug — same template, listing, rotation and metadata as every other city.
 * Deleting this folder is safe: [city] then serves /firmalar/ankara identically.
 */

const params = Promise.resolve({ city: "ankara" });

export const dynamic = "force-dynamic";

// Both delegates answer 404 (notFound) while Ankara has no published firm, exactly like /firmalar/<slug>.
export async function generateMetadata() {
  return await cityMetadata({ params });
}

export default async function AnkaraPage() {
  return await CityPage({ params });
}
