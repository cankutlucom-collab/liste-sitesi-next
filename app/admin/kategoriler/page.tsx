import { requireAdmin } from "../../../lib/auth";
import {
  ERROR_MESSAGES, defaultPageTexts, getPageSeo, isErrorCode, listCategoriesForAdmin, listCategoryCities,
  CATEGORY_NAME_MAX, CATEGORY_SLUG_MAX, type CategoryAdminRow, type PageSeo,
} from "../../../lib/category-store";
import { CATEGORY_PATH, CATEGORY_SLUG, CITY_TOKENS, cityPagePath } from "../../../lib/cities";
import { LIMITS, cityBySlug } from "../../../lib/city-store";
import PatternRow, { CityMetaFields } from "../seo/sehirler/CopyPattern";
import { addFaqAction, createCategoryAction, deleteFaqAction, saveMetaAction, updateFaqAction } from "./actions";

/*
 * Kategoriler. Lists the categories and adds one (address only: lowercase a-z and hyphen). Choosing
 * Düzenle (?kategori=<slug>) opens that category's page texts (title, description, FAQ) and the list of
 * its city pages; choosing a city (&sehir=<slug>) opens the texts of that category+city page.
 * Public effect today: lib/category-store.ts + app/su-yumusatma-cihazi (category page and [city] page).
 */

const OK_NOTICES: Record<string, string> = {
  eklendi: "Kategori eklendi. Firma formunda seçilebilir.",
  kaydedildi: "Başlık ve açıklama kaydedildi.",
  "soru-eklendi": "Soru eklendi.",
  "soru-kaydedildi": "Soru güncellendi.",
  "soru-silindi": "Soru silindi.",
};

const TR_FOLD: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c" };

function norm(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replace(/[ışğüöç]/g, (ch) => TR_FOLD[ch]).normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function categoryHref(category: string, city = "", q = ""): string {
  const query = new URLSearchParams({ kategori: category });
  if (city) query.set("sehir", city);
  if (q) query.set("q", q);
  return `/admin/kategoriler?${query.toString()}`;
}

/** Title, description and FAQ forms of one page. city = "" is the category page itself. */
function PageTextEditor({
  category, city, cityName, firmCount, seo, titleDefault, descriptionDefault,
}: {
  category: string;
  city: string;
  cityName: string;
  firmCount: number;
  seo: PageSeo;
  titleDefault: string;
  descriptionDefault: string;
}) {
  const tokens = city ? CITY_TOKENS : CITY_TOKENS.filter((token) => token !== "[Şehir Adı]");
  return (
    <div className="adm-form">
      <form action={saveMetaAction} className="adm-form">
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="city" value={city} />
        <PatternRow tokens={tokens} />
        <CityMetaFields
          title={seo.metaTitle || titleDefault}
          description={seo.metaDescription || descriptionDefault}
          cityName={cityName}
          firmCount={firmCount}
          titleLimit={LIMITS.metaTitle}
          descriptionLimit={LIMITS.metaDescription} />
        <small className="adm-muted">Alanları boş bırakırsanız sayfanın hazır metni kullanılır.</small>
        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary">Başlık ve açıklamayı kaydet</button>
        </div>
      </form>

      <h3 style={{ margin: "8px 0 0" }}>Sık sorulan sorular</h3>
      <p className="adm-muted" style={{ margin: 0 }}>
        Sayfada görünen sorular. Metni değiştirip kaydedebilir, soru ekleyebilir veya silebilirsiniz.
        {seo.faqs.length === 0 && " Hiç soru yoksa sayfada tasarımdaki hazır sorular gösterilir."}
      </p>

      {seo.faqs.map((faq, index) => (
        <form key={faq.id} action={updateFaqAction} className="adm-form" style={{ borderTop: "1px solid #DCE3EC", paddingTop: 16 }}>
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="city" value={city} />
          <input type="hidden" name="id" value={faq.id} />
          <div className="adm-field">
            <label htmlFor={`soru-${faq.id}`}>Soru {index + 1}</label>
            <input id={`soru-${faq.id}`} name="question" type="text" required maxLength={LIMITS.question} defaultValue={faq.question} />
          </div>
          <div className="adm-field">
            <label htmlFor={`cevap-${faq.id}`}>Cevap</label>
            <textarea id={`cevap-${faq.id}`} name="answer" rows={3} required maxLength={LIMITS.answer} defaultValue={faq.answer} />
          </div>
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--small adm-btn--primary">Kaydet</button>
            <button type="submit" formAction={deleteFaqAction} formNoValidate className="adm-btn adm-btn--small adm-btn--danger">Soruyu sil</button>
          </div>
        </form>
      ))}

      <form action={addFaqAction} className="adm-form" style={{ borderTop: "1px solid #DCE3EC", paddingTop: 16 }}>
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="city" value={city} />
        <div className="adm-field">
          <label htmlFor="soru-yeni">Yeni soru</label>
          <input id="soru-yeni" name="question" type="text" required maxLength={LIMITS.question} />
        </div>
        <div className="adm-field">
          <label htmlFor="cevap-yeni">Cevap</label>
          <textarea id="cevap-yeni" name="answer" rows={3} required maxLength={LIMITS.answer} />
        </div>
        <div className="adm-actions">
          <button type="submit" className="adm-btn">Soru ekle</button>
        </div>
      </form>
    </div>
  );
}

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const categories = listCategoriesForAdmin();
  const selected: CategoryAdminRow | null = categories.find((category) => category.slug === one(params.kategori)) ?? null;
  const city = selected ? cityBySlug(one(params.sehir)) : null;

  const ok = OK_NOTICES[one(params.durum)];
  const errorCode = one(params.hata);
  const error = isErrorCode(errorCode) ? ERROR_MESSAGES[errorCode] : "";

  const isMain = selected?.slug === CATEGORY_SLUG;
  const q = one(params.q).slice(0, 100).trim();
  const qKey = norm(q);

  const categorySeo = selected && !city ? getPageSeo(selected.slug, "") : null;
  const citySeo = selected && city ? getPageSeo(selected.slug, city.slug) : null;
  const cityRows = selected && !city ? listCategoryCities(selected.slug) : [];
  const cityRow = selected && city ? listCategoryCities(selected.slug).find((row) => row.slug === city.slug) : undefined;
  const shownCities = cityRows.filter((row) => !qKey || norm(row.name).includes(qKey));

  return (
    <div className="adm-list">
      <div className="adm-list__head">
        <div>
          {selected ? (
            <>
              <a href={city ? categoryHref(selected.slug) : "/admin/kategoriler"} className="adm-back">
                {city ? `${selected.slug} sayfasına dön` : "Kategori listesine dön"}
              </a>
              <h1>{city ? `${selected.slug} · ${city.name}` : selected.slug}</h1>
            </>
          ) : (
            <>
              <h1>Kategoriler</h1>
              <p className="adm-muted">
                Her kategorinin kendi sayfası ve şehir sayfaları vardır. Firmalar, firma formunda kategoriye atanır.
              </p>
            </>
          )}
        </div>
      </div>

      {ok && <p className="adm-alert adm-alert--ok" role="status">{ok}</p>}
      {error && <p className="adm-alert adm-alert--error" role="alert">{error}</p>}

      {!selected && (
        <section className="adm-card" aria-labelledby="kategori-ekle">
          <form action={createCategoryAction} className="adm-form">
            <h2 id="kategori-ekle" style={{ margin: 0 }}>Kategori ekle</h2>
            <div className="adm-field">
              <label htmlFor="yeni-kategori-ad">Kategori adı</label>
              <input id="yeni-kategori-ad" name="name" type="text" required minLength={2} maxLength={CATEGORY_NAME_MAX} autoComplete="off" />
              <small>Türkçe karakterlerle yazın (ör. Su Arıtma Cihazı). Başlıkta &quot;Su Arıtma Cihazı&quot;, cümle içinde &quot;su arıtma cihazı&quot; olarak kullanılır; sayfa başlığı ve açıklaması bu adla hazır doldurulur.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="yeni-kategori">Kategori adresi</label>
              <input id="yeni-kategori" name="slug" type="text" required minLength={2} maxLength={CATEGORY_SLUG_MAX}
                pattern="[a-z]+(-[a-z]+)*" autoComplete="off" spellCheck={false} />
              <small>Küçük harf ve tire; Türkçe karakter, büyük harf, rakam ve boşluk yok (ör. su-aritma-cihazi). Adres olduğu gibi kaydedilir, otomatik düzeltilmez.</small>
            </div>
            <div className="adm-actions">
              <button type="submit" className="adm-btn adm-btn--primary">Kategori ekle</button>
            </div>
          </form>
        </section>
      )}

      {!selected && (
        <section className="adm-panel" aria-labelledby="kategori-liste">
          <div className="adm-panel__bar"><h2 id="kategori-liste">Kayıtlı kategoriler</h2></div>
          <table className="adm-table">
            <caption className="adm-sr">Kayıtlı kategoriler</caption>
            <thead>
              <tr><th scope="col">Adres</th><th scope="col">Firmalar</th><th scope="col">İşlem</th></tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={3}>Henüz kategori yok.</td></tr>
              ) : categories.map((category) => (
                <tr key={category.slug}>
                  <td data-label="Adres"><strong>/{category.slug}</strong> <span className="adm-muted">· {category.name}</span></td>
                  <td data-label="Firmalar">
                    {category.total ? `${category.published} yayında, ${category.total - category.published} taslak` : <span className="adm-muted">Firma yok</span>}
                  </td>
                  <td data-label="İşlem">
                    <div className="adm-row-actions">
                      <a href={categoryHref(category.slug)} className="adm-btn adm-btn--small adm-btn--outline">Sayfa metinleri</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {selected && categorySeo && (
        <section className="adm-card" aria-labelledby="kategori-metin">
          <div className="adm-form">
            <h2 id="kategori-metin" style={{ margin: 0 }}>Kategori sayfası · başlık, açıklama, SSS</h2>
            {isMain
              ? <a href={CATEGORY_PATH} target="_blank" rel="noopener" className="adm-link">Kategori sayfasını aç ↗</a>
              : <p className="adm-alert adm-alert--info" role="note">Bu kategorinin herkese açık sayfası henüz yok; metinler kaydedilir ve sayfa açıldığında kullanılır.</p>}
            <PageTextEditor
              category={selected.slug}
              city=""
              cityName=""
              firmCount={selected.published}
              seo={categorySeo}
              titleDefault={defaultPageTexts(selected.slug, "").title}
              descriptionDefault={defaultPageTexts(selected.slug, "").description} />
          </div>
        </section>
      )}

      {selected && categorySeo && (
        <section className="adm-panel" aria-labelledby="sehir-liste">
          <div className="adm-panel__bar">
            <h2 id="sehir-liste">Kategori + şehir sayfaları</h2>
            <form method="get" action="/admin/kategoriler" className="adm-filters" role="search">
              <input type="hidden" name="kategori" value={selected.slug} />
              <div className="adm-search">
                <label htmlFor="sehir-ara" className="adm-sr">Şehir ara</label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6B80" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                <input id="sehir-ara" type="search" name="q" defaultValue={q} maxLength={100} placeholder="Şehir adı yazın" />
              </div>
              <button type="submit" className="adm-btn adm-btn--tall">Ara</button>
              {q && <a href={categoryHref(selected.slug)} className="adm-link">Temizle</a>}
            </form>
          </div>
          <table className="adm-table">
            <caption className="adm-sr">Şehir sayfaları</caption>
            <thead>
              <tr><th scope="col">Şehir</th><th scope="col">Adres</th><th scope="col">Bu kategoride yayında</th><th scope="col">Metin</th><th scope="col">İşlem</th></tr>
            </thead>
            <tbody>
              {shownCities.length === 0 ? (
                <tr><td colSpan={5}>{q ? "Bu aramaya uyan şehir yok." : "Kayıtlı şehir yok."}</td></tr>
              ) : shownCities.map((row) => (
                <tr key={row.slug}>
                  <td data-label="Şehir"><strong>{row.name}</strong></td>
                  <td data-label="Adres">{isMain ? cityPagePath(row.slug) : `/${selected.slug}/${row.slug}`}</td>
                  <td data-label="Bu kategoride yayında">{row.published || <span className="adm-muted">Yok · sitede görünmez</span>}</td>
                  <td data-label="Metin">{row.hasText ? "Özel başlık/açıklama" : "Hazır metin"} · {row.faqCount} soru</td>
                  <td data-label="İşlem">
                    <div className="adm-row-actions">
                      <a href={`${categoryHref(selected.slug, row.slug, q)}#sehir-metin`} className="adm-btn adm-btn--small adm-btn--outline">Düzenle</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {selected && city && citySeo && (
        <section className="adm-card" aria-labelledby="sehir-metin">
          <div className="adm-form">
            <h2 id="sehir-metin" style={{ margin: 0 }}>{city.name} sayfası · başlık, açıklama, SSS</h2>
            {(cityRow?.published ?? 0) === 0 && (
              <p className="adm-alert adm-alert--info" role="note">
                Bu şehirde bu kategoride yayında firma yok; sayfası şu an açılmıyor (404). Metinler kaydedilir ve ilk firma yayınlanınca kullanılır.
              </p>
            )}
            {isMain && (cityRow?.published ?? 0) > 0 && (
              <a href={cityPagePath(city.slug)} target="_blank" rel="noopener" className="adm-link">Şehir sayfasını aç ↗</a>
            )}
            {!isMain && (
              <p className="adm-alert adm-alert--info" role="note">Bu kategorinin herkese açık sayfaları henüz yok; metinler kaydedilir ve sayfalar açıldığında kullanılır.</p>
            )}
            <PageTextEditor
              category={selected.slug}
              city={city.slug}
              cityName={city.name}
              firmCount={cityRow?.published ?? 0}
              seo={citySeo}
              titleDefault={defaultPageTexts(selected.slug, city.slug).title}
              descriptionDefault={defaultPageTexts(selected.slug, city.slug).description} />
          </div>
        </section>
      )}
    </div>
  );
}
