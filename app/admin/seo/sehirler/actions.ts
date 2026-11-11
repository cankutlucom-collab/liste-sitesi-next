"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth";
import { CATEGORY_PATH, cityPagePath } from "../../../../lib/cities";
import { createCity, deleteCity } from "../../../../lib/city-store";

/*
 * City panel actions (/admin/seo/sehirler): open and delete a city. Page texts (title, description, FAQ)
 * are edited per category in /admin/kategoriler. Every action re-checks the admin session, validates on
 * the server and answers with a redirect: ?durum=<ok code> or ?hata=<error code> (texts live on the page).
 */

const BASE = "/admin/seo/sehirler";

function slugField(formData: FormData): string {
  return String(formData.get("slug") ?? "").slice(0, 60);
}

/** Pages whose content depends on the city records: footer city nav, the category index, the city page, the sitemap. */
function refresh(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath(CATEGORY_PATH);
  if (slug) revalidatePath(cityPagePath(slug));
  revalidatePath(BASE);
}

export async function createCityAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const result = createCity(formData.get("name"));
  if (!result.ok) redirect(`${BASE}?hata=${result.code}`);
  refresh(result.slug);
  redirect(`${BASE}?durum=eklendi&sehir=${encodeURIComponent(result.slug ?? "")}`);
}

export async function deleteCityAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = slugField(formData);
  const result = deleteCity(slug);
  if (!result.ok) redirect(`${BASE}?hata=${result.code}`);
  refresh(slug);
  redirect(`${BASE}?durum=silindi`);
}
