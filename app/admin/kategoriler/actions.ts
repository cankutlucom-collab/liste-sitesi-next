"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/auth";
import {
  addPageFaq, createCategory, deletePageFaq, renameCategorySlug, savePageMeta, updatePageFaq, type Result,
} from "../../../lib/category-store";
import { parseId } from "../../../lib/firms";

/*
 * Category panel actions (/admin/kategoriler): add a category and edit the title, description and FAQ of a
 * category page (city = "") or a category+city page. Every action re-checks the admin session, validates
 * on the server and answers with a redirect: ?durum=<ok code> or ?hata=<error code> (texts live on the page).
 */

const BASE = "/admin/kategoriler";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").slice(0, 80);
}

function editorUrl(category: string, city: string): string {
  return `${BASE}?kategori=${encodeURIComponent(category)}${city ? `&sehir=${encodeURIComponent(city)}` : ""}`;
}

/** Back to the same page's editor with either a success or an error code. */
function done(result: Result, category: string, city: string, ok: string): never {
  const url = editorUrl(category, city);
  if (result.ok === false) redirect(`${url}&hata=${result.code}`);
  // Page texts are read per request, but the whole site is marked anyway (same as the other panel actions).
  revalidatePath("/", "layout");
  revalidatePath(BASE);
  redirect(`${url}&durum=${ok}`);
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const result = createCategory(formData.get("slug"), formData.get("name"));
  if (result.ok === false) redirect(`${BASE}?hata=${result.code}`);
  revalidatePath("/", "layout");
  revalidatePath(BASE);
  redirect(`${BASE}?durum=eklendi&kategori=${encodeURIComponent(result.slug ?? "")}`);
}

export async function renameCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const category = field(formData, "category");
  const result = renameCategorySlug(category, formData.get("slug"));
  if (result.ok === false) redirect(`${editorUrl(category, "")}&hata=${result.code}`);
  revalidatePath("/", "layout");
  revalidatePath(BASE);
  redirect(`${editorUrl(result.slug ?? category, "")}&durum=adres-kaydedildi`);
}

export async function saveMetaAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const category = field(formData, "category");
  const city = field(formData, "city");
  done(savePageMeta(category, city, formData.get("metaTitle"), formData.get("metaDescription")), category, city, "kaydedildi");
}

export async function addFaqAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const category = field(formData, "category");
  const city = field(formData, "city");
  done(addPageFaq(category, city, formData.get("question"), formData.get("answer")), category, city, "soru-eklendi");
}

export async function updateFaqAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const category = field(formData, "category");
  const city = field(formData, "city");
  const id = parseId(formData.get("id"));
  done(id ? updatePageFaq(category, city, id, formData.get("question"), formData.get("answer")) : { ok: false, code: "soru-yok" }, category, city, "soru-kaydedildi");
}

export async function deleteFaqAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const category = field(formData, "category");
  const city = field(formData, "city");
  const id = parseId(formData.get("id"));
  done(id ? deletePageFaq(category, city, id) : { ok: false, code: "soru-yok" }, category, city, "soru-silindi");
}
