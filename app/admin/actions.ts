"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminConfigured, ADMIN_SETUP_HINT, endSession, loginClientKey, loginLocked, passwordMatches,
  recordLoginFailure, recordLoginSuccess, requireAdmin, startSession,
} from "../../lib/auth";
import { listCategories } from "../../lib/category-store";
import { CATEGORY_SLUG } from "../../lib/cities";
import { cityPath } from "../../lib/city-store";
import {
  createFirm, deleteDraftFirm, firmProfilePath, getFirm, listFirmCategories, parseId, setFirmCategories, setFirmStatus,
  updateFirm, validateFirm,
  type FieldErrors, type FirmInput, type FirmStatus,
} from "../../lib/firms";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: ADMIN_SETUP_HINT };
  const client = await loginClientKey();
  // No await between the lock check and recording a failure, so parallel requests cannot slip past the limit.
  const locked = loginLocked(client);
  if (locked) return { error: `Çok fazla hatalı deneme. ${locked} dakika sonra tekrar deneyin.` };

  const password = String(formData.get("password") ?? "");
  if (!password || password.length > 512 || !passwordMatches(password)) {
    recordLoginFailure(client);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Şifre hatalı." };
  }
  recordLoginSuccess(client);
  await startSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin");
}

export type FirmFormState = {
  errors: FieldErrors;
  message?: string;
  values?: FirmInput;
  /** Category slugs as submitted (kept so a failed save does not lose the selection). */
  categories?: string[];
  categoryError?: string;
};

/**
 * Pages that can show the firm: homepage, its profile, and the list page of every city it was
 * or now is in (old and new city when the city changed). Cities that are not registered have no page.
 * A firm going live or offline can add/remove a city from the footer nav, /sehirler and the sitemap,
 * so the whole site is marked for revalidation (prerendered pages such as blog/policy rebuild their footer).
 */
function refreshPublicPages(firmId: number, cities: string[]) {
  revalidatePath("/", "layout");
  revalidatePath("/");
  const saved = getFirm(firmId);
  if (saved) revalidatePath(firmProfilePath(saved));
  for (const city of new Set(cities)) {
    const path = cityPath(city);
    if (path) revalidatePath(path);
  }
  revalidatePath("/admin");
}

/** Create/update from the form. intent: "save" (keeps status), "publish", "unpublish". */
export async function saveFirmAction(_prev: FirmFormState, formData: FormData): Promise<FirmFormState> {
  await requireAdmin();

  const intent = String(formData.get("intent") ?? "save");
  if (!["save", "publish", "unpublish"].includes(intent)) return { errors: {}, message: "Geçersiz işlem." };

  const rawId = formData.get("id");
  const id = rawId ? parseId(rawId) : null;
  if (rawId && !id) return { errors: {}, message: "Geçersiz kayıt." };
  const existing = id ? getFirm(id) : null;
  if (id && !existing) return { errors: {}, message: "Firma bulunamadı; silinmiş olabilir." };

  const status: FirmStatus =
    intent === "publish" ? "published" : intent === "unpublish" ? "draft" : existing?.status ?? "draft";

  const raw = Object.fromEntries(
    ["name", "city", "phone", "email", "address", "whatsapp", "website", "mapUrl", "shortDescription", "packageLevel"].map((key) => [key, formData.get(key)]),
  );
  // Package is optional and never a publish requirement. If a request omits the field entirely,
  // keep the stored package instead of silently clearing it; validateFirm applies the allow-list.
  if (!formData.has("packageLevel")) raw.packageLevel = existing?.packageLevel ?? "";
  const { values, errors, valid } = validateFirm(raw, status === "published" ? "publish" : "draft");

  // Categories: only registered slugs. A request without the form's marker field keeps the stored
  // categories (a new firm gets the current category), like the package field above.
  const knownCategories = new Set(listCategories().map((category) => category.slug));
  let categories: string[];
  let categoryError: string | undefined;
  if (formData.has("categoriesPresent")) {
    const submitted = [...new Set(formData.getAll("categories").map(String))];
    categories = submitted.filter((slug) => knownCategories.has(slug));
    if (categories.length !== submitted.length) categoryError = "Geçersiz kategori seçimi. Listeden kategori seçin.";
  } else {
    categories = existing ? listFirmCategories(existing.id) : [CATEGORY_SLUG];
  }

  if (!valid || categoryError) {
    return {
      errors,
      values,
      categories,
      categoryError,
      message: status === "published"
        ? "Yayınlamak için işaretli alanları tamamlayın. Kayıt değiştirilmedi."
        : "İşaretli alanları düzeltin. Kayıt değiştirilmedi.",
    };
  }

  let savedId: number;
  if (existing) {
    updateFirm(existing.id, values, status);
    setFirmCategories(existing.id, categories);
    savedId = existing.id;
  } else {
    savedId = createFirm(values, status, categories);
  }
  refreshPublicPages(savedId, existing ? [existing.city, values.city] : [values.city]);

  const notice = intent === "publish" ? "yayinlandi" : intent === "unpublish" ? "kaldirildi" : "kaydedildi";
  redirect(`/admin/firmalar/${savedId}?durum=${notice}`);
}

/** Quick publish/unpublish from the list. Publishing re-validates the stored record. */
export async function setStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = parseId(formData.get("id"));
  const firm = id ? getFirm(id) : null;
  if (!firm) redirect("/admin?durum=bulunamadi");

  const target = String(formData.get("status"));
  if (target === "published") {
    const { valid } = validateFirm(firm as unknown as Record<string, unknown>, "publish");
    if (!valid) redirect(`/admin/firmalar/${firm.id}?durum=eksik`);
    setFirmStatus(firm.id, "published");
  } else if (target === "draft") {
    setFirmStatus(firm.id, "draft");
  } else {
    redirect("/admin");
  }
  refreshPublicPages(firm.id, [firm.city]);
  redirect(`/admin?durum=${target === "published" ? "yayinlandi" : "kaldirildi"}`);
}

export async function deleteDraftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = parseId(formData.get("id"));
  const deleted = id ? deleteDraftFirm(id) : false;
  redirect(deleted ? "/admin?durum=silindi" : "/admin?durum=silinemedi");
}
