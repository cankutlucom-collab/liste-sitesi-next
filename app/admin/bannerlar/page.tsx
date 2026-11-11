import { requireAdmin } from "../../../lib/auth";
import {
  BANNER_ERRORS, BANNER_LIMITS, BANNER_SLOTS, getBanner, isBannerError, isBannerSlot,
} from "../../../lib/banners";

/*
 * Bannerlar: the two fixed banner areas of the public design. Nothing here adds a new position.
 * Saving posts to /admin/bannerlar/kaydet (Route Handler, because of the image upload).
 */

const OK_NOTICES: Record<string, string> = {
  kaydedildi: "Banner kaydedildi.",
  kaldirildi: "Banner kaldırıldı; alan yer tutucu metne döndü.",
};

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function BannerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const ok = OK_NOTICES[one(params.durum)];
  const errorCode = one(params.hata);
  const error = isBannerError(errorCode) ? BANNER_ERRORS[errorCode] : "";
  const errorSlot = one(params.slot);

  return (
    <div className="adm-list">
      <div className="adm-list__head">
        <div>
          <h1>Bannerlar</h1>
          <p className="adm-muted">
            Ana sayfa tasarımındaki iki sabit banner alanı. Yayında olmayan veya kaydı bulunmayan alanda
            tasarımdaki yer tutucu metin görünür. Görsel: png, jpeg veya webp, en fazla 1 MB.
          </p>
        </div>
      </div>

      {ok && <p className="adm-alert adm-alert--ok" role="status">{ok}</p>}
      {error && !isBannerSlot(errorSlot) && <p className="adm-alert adm-alert--error" role="alert">{error}</p>}

      {BANNER_SLOTS.map((slot) => {
        const banner = getBanner(slot.key);
        const hasImage = Boolean(banner?.file);
        const preview = hasImage ? `/banner-gorsel/${slot.key}?v=${Date.parse(banner?.updatedAt ?? "") || 0}` : "";
        const slotError = error && errorSlot === slot.key ? error : "";
        return (
          <section key={slot.key} className="adm-card" aria-labelledby={`banner-${slot.key}`}>
            <form action="/admin/bannerlar/kaydet" method="post" encType="multipart/form-data" className="adm-form">
              <input type="hidden" name="slot" value={slot.key} />
              <div>
                <h2 id={`banner-${slot.key}`} style={{ margin: 0 }}>{slot.label} · {slot.size}</h2>
                <p className="adm-muted" style={{ margin: "4px 0 0" }}>
                  {slot.note} Durum: {banner?.enabled && hasImage ? "Yayında" : hasImage ? "Kapalı" : "Görsel yok (yer tutucu görünür)"}.
                </p>
              </div>

              {slotError && <p className="adm-alert adm-alert--error" role="alert">{slotError}</p>}

              {hasImage && (
                <div className="adm-banner-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={banner?.alt || `${slot.label} önizleme`} />
                </div>
              )}

              <div className="adm-field">
                <label htmlFor={`gorsel-${slot.key}`}>{hasImage ? "Görseli değiştir" : "Görsel yükle"}</label>
                <input id={`gorsel-${slot.key}`} name="gorsel" type="file" accept="image/png,image/jpeg,image/webp" />
                <small>Önerilen ölçü {slot.size}. png, jpeg veya webp · en fazla 1 MB.</small>
              </div>
              <div className="adm-field">
                <label htmlFor={`alt-${slot.key}`}>Alternatif metin</label>
                <input id={`alt-${slot.key}`} name="alt" type="text" maxLength={BANNER_LIMITS.alt} defaultValue={banner?.alt ?? ""} autoComplete="off" />
                <small>Yayındaki görsel için zorunlu · en fazla {BANNER_LIMITS.alt} karakter.</small>
              </div>
              <div className="adm-field">
                <label htmlFor={`baglanti-${slot.key}`}>Bağlantı</label>
                <input id={`baglanti-${slot.key}`} name="baglanti" type="text" maxLength={BANNER_LIMITS.link} defaultValue={banner?.link ?? ""} autoComplete="off" placeholder="https://… veya /yol" />
                <small>Boş olabilir. Yalnızca http, https veya / ile başlayan site içi yol. Dış bağlantılar yeni sekmede açılır.</small>
              </div>
              <label className="adm-check">
                <input type="checkbox" name="yayinda" value="1" defaultChecked={banner?.enabled ?? false} />
                Yayında
              </label>

              <div className="adm-actions">
                <button type="submit" name="islem" value="kaydet" className="adm-btn adm-btn--primary">Kaydet</button>
                {(banner || hasImage) && (
                  <button type="submit" name="islem" value="kaldir" formNoValidate className="adm-btn adm-btn--danger">Kaldır</button>
                )}
              </div>
            </form>
          </section>
        );
      })}
    </div>
  );
}
