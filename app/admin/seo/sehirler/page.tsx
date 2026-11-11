import { requireAdmin } from "../../../../lib/auth";
import { CATEGORY_SLUG, cityPagePath, defaultCityTitle } from "../../../../lib/cities";
import { ERROR_MESSAGES, LIMITS, isErrorCode, listCitiesForAdmin, type CityAdminRow } from "../../../../lib/city-store";
import { createCityAction } from "./actions";
import DeleteCityForm from "./DeleteCityForm";

/*
 * SEO > Şehirler. The list opens a city, deletes one (refused while any firm record uses it) and
 * filters the catalog. A city's page title, description and FAQ are edited per category in
 * /admin/kategoriler (the "Düzenle" link leads there).
 */

const OK_NOTICES: Record<string, string> = {
  eklendi: "Şehir açıldı. Firma formunun şehir listesinde seçilebilir; sayfası, yayında ilk firma olunca görünür.",
  silindi: "Şehir silindi.",
};

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function firmSummary(city: CityAdminRow): string {
  return [city.published ? `${city.published} yayında` : "", city.drafts ? `${city.drafts} taslak` : ""]
    .filter(Boolean).join(", ");
}

const FILTERS = {
  "": (_city: CityAdminRow) => true,
  yayinda: (city: CityAdminRow) => city.published > 0,
  taslak: (city: CityAdminRow) => city.published === 0,
} as const;

const TR_FOLD: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c" };

function norm(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replace(/[ışğüöç]/g, (ch) => TR_FOLD[ch]).normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function listHref(filter: string, q?: string): string {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (filter) query.set("f", filter);
  const text = query.toString();
  return text ? `/admin/seo/sehirler?${text}` : "/admin/seo/sehirler";
}

/** The city's page texts for the current category live in the category panel. */
function textsHref(citySlug: string): string {
  return `/admin/kategoriler?kategori=${encodeURIComponent(CATEGORY_SLUG)}&sehir=${encodeURIComponent(citySlug)}`;
}

export default async function CitySeoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const cities = listCitiesForAdmin();
  const statusKey = one(params.f) in FILTERS && one(params.f) !== "" ? one(params.f) as "yayinda" | "taslak" : "";
  const q = one(params.q).slice(0, 100).trim();
  const qKey = norm(q);
  const shown = cities.filter(FILTERS[statusKey]).filter((city) => !qKey || norm(city.name).includes(qKey));
  const selected = cities.find((city) => city.slug === one(params.sehir)) ?? null;

  const ok = OK_NOTICES[one(params.durum)];
  const errorCode = one(params.hata);
  let error: string = isErrorCode(errorCode) ? ERROR_MESSAGES[errorCode] : "";
  if (errorCode === "firma-var" && selected) error = `${selected.name} silinemedi: bu şehirde ${firmSummary(selected)} firma kaydı var. Önce firmaları başka bir şehre taşıyın veya silin.`;

  const visibleCount = cities.filter((city) => city.published > 0).length;

  return (
    <div className="adm-list">
      <div className="adm-list__head">
        <div>
          <h1>SEO · Şehirler</h1>
          <p className="adm-muted">
            Şehir sayfası yalnızca yayında en az bir firması olan şehirler için vardır; diğer şehirler sitede görünmez ve adresleri 404 verir.
            Şu an görünen şehir: {visibleCount} / {cities.length}. Sayfa başlığı, açıklaması ve SSS metinleri <a href="/admin/kategoriler">Kategoriler</a> bölümünden düzenlenir.
          </p>
        </div>
      </div>

      {ok && <p className="adm-alert adm-alert--ok" role="status">{ok}</p>}
      {error && <p className="adm-alert adm-alert--error" role="alert">{error}</p>}

      <section className="adm-card" aria-labelledby="sehir-ac">
        <form action={createCityAction} className="adm-form">
          <h2 id="sehir-ac" style={{ margin: 0 }}>Şehir aç</h2>
          <div className="adm-field">
            <label htmlFor="yeni-sehir">Şehir adı</label>
            <input id="yeni-sehir" name="name" type="text" required maxLength={LIMITS.name} autoComplete="off" placeholder="Örn. Kıbrıs" />
            <small>Sayfa adresi şehir adından otomatik üretilir: küçük harf, Türkçe karaktersiz, yalnızca a-z ve tire (ör. /su-yumusatma-cihazi/afyon-karahisar).</small>
          </div>
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary">Şehri aç</button>
          </div>
        </form>
      </section>

      <section className="adm-panel" aria-labelledby="sehir-liste">
        <div className="adm-panel__bar">
          <h2 id="sehir-liste">Şehirler</h2>
          <form method="get" action="/admin/seo/sehirler" className="adm-filters" role="search">
            <div className="adm-search">
              <label htmlFor="sehir-ara" className="adm-sr">Şehir ara</label>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6B80" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <input id="sehir-ara" type="search" name="q" defaultValue={q} maxLength={100} placeholder="Şehir adı yazın" />
            </div>
            <label className="adm-filter">Durum
              <select name="f" defaultValue={statusKey}>
                <option value="">Tümü</option>
                <option value="yayinda">Yayında</option>
                <option value="taslak">Taslak</option>
              </select>
            </label>
            <button type="submit" className="adm-btn adm-btn--tall">Uygula</button>
            {(q || statusKey) && <a href={listHref("")} className="adm-link">Temizle</a>}
          </form>
        </div>
        <table className="adm-table">
          <caption className="adm-sr">Kayıtlı şehirler</caption>
          <thead>
            <tr><th scope="col">Şehir</th><th scope="col">Adres</th><th scope="col">Firmalar</th><th scope="col">Sayfa metni</th><th scope="col">İşlem</th></tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={5}>{q ? "Bu aramaya uyan şehir yok." : "Bu filtrede şehir yok."}</td></tr>
            ) : shown.map((city) => {
              const hasFirms = city.published + city.drafts > 0;
              return (
                <tr key={city.slug}>
                  <td data-label="Şehir"><strong>{city.name}</strong></td>
                  <td data-label="Adres">{cityPagePath(city.slug)}</td>
                  <td data-label="Firmalar">
                    {hasFirms ? firmSummary(city) : <span className="adm-muted">Firma yok · sitede görünmez</span>}
                  </td>
                  <td data-label="Sayfa metni">{defaultCityTitle(city.name, city.published)}</td>
                  <td data-label="İşlem">
                    <div className="adm-row-actions">
                      <a href={textsHref(city.slug)} className="adm-btn adm-btn--small adm-btn--outline">Düzenle</a>
                      {hasFirms
                        ? <small className="adm-muted">Silinemez: {firmSummary(city)} firma kaydı var.</small>
                        : <DeleteCityForm slug={city.slug} name={city.name} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
