import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth";
import { listCities } from "../../../../lib/city-store";
import { listCategories } from "../../../../lib/category-store";
import { firmProfilePath, getFirm, listFirmCategories, parseId, validateFirm } from "../../../../lib/firms";
import FirmForm from "../../FirmForm";

const NOTICES: Record<string, { text: string; kind: "ok" | "error" }> = {
  kaydedildi: { text: "Değişiklikler kaydedildi.", kind: "ok" },
  kaldirildi: { text: "Firma yayından kaldırıldı; taslak olarak saklanıyor.", kind: "ok" },
  eksik: { text: "Firma yayınlanamadı: “Yayın kontrolü” listesindeki eksik alanları tamamlayıp “Yayınla”ya basın.", kind: "error" },
};

const DATE_FORMAT = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
});

function formatDate(iso: string): string | undefined {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : DATE_FORMAT.format(date);
}

export default async function EditFirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const id = parseId((await params).id);
  const firm = id ? getFirm(id) : null;
  if (!firm) notFound();

  const durum = String((await searchParams).durum ?? "");
  const notice = durum === "yayinlandi"
    ? { text: `Firma yayınlandı ve ${firm.city} listesinde görünüyor.`, kind: "ok" as const }
    : NOTICES[durum];
  const check = validateFirm(firm as unknown as Record<string, unknown>, "publish");
  const missing = Object.keys(check.errors);

  return (
    <FirmForm
      key={firm.updatedAt}
      cities={listCities()}
      categories={listCategories()}
      firmCategories={listFirmCategories(firm.id)}
      firm={firm}
      publicProfilePath={firm.status === "published" ? firmProfilePath(firm) : undefined}
      missing={missing}
      updatedLabel={formatDate(firm.updatedAt)}
      notice={notice}
    />
  );
}
