"use server";

import { redirect } from "next/navigation";
import { createDraftFromApplication } from "../../../lib/applications";
import { requireAdmin } from "../../../lib/auth";
import { parseId } from "../../../lib/firms";

export async function createApplicationDraft(formData: FormData) {
  await requireAdmin();
  const id = parseId(String(formData.get("applicationId") ?? ""));
  const firmId = id ? createDraftFromApplication(id) : null;
  redirect(firmId ? `/admin/firmalar/${firmId}` : "/admin/basvurular?durum=taslak-olusturulamadi");
}
