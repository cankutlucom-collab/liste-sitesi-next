import { adminConfigured, ADMIN_SETUP_HINT, isAdmin } from "../../lib/auth";
import { firmProfilePath, listFirms, supportedCities, validateFirm, type Firm, type FirmStatus } from "../../lib/firms";
import { setStatusAction } from "./actions";
import LoginForm from "./LoginForm";
import DeleteDraftForm from "./DeleteDraftForm";
import { firmLogoPath } from "../../lib/firm-logos";

const NOTICES: Record<string, { text: string; kind: "ok" | "error" }> = {
  yayinlandi: { text: "Firma yayınlandı ve kendi şehrinin listesinde görünüyor.", kind: "ok" },
  kaldirildi: { text: "Firma yayından kaldırıldı; artık taslak.", kind: "ok" },
  bulunamadi: { text: "Firma bulunamadı.", kind: "error" },
  silindi: { text: "Firma taslağı silindi.", kind: "ok" },
  silinemedi: { text: "Firma silinemedi. Silme işlemi yalnızca mevcut taslaklar için kullanılabilir.", kind: "error" },
};

// URL value -> stored status. Only statuses that exist in the data model are offered.
const STATUS_FILTERS: Record<string, FirmStatus> = { yayinda: "published", taslak: "draft" };

const AVATAR_TONES = [
  { bg: "#E3F4F1", fg: "#0B3B36" },
  { bg: "#FDEBDD", fg: "#7A3A00" },
  { bg: "#EDE7FB", fg: "#3D2A7A" },
  { bg: "#E7EAFF", fg: "#0A1466" },
];

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const TR_FOLD: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c" };

// Diacritic-insensitive search key: "Arıtma"/"aritma" and "İstanbul"/"Istanbul" all match.
// Turkish lowercasing first (İ→i, I→ı), then fold Turkish letters and strip any remaining accents (â, î, û…).
function norm(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ışğüöç]/g, (ch) => TR_FOLD[ch])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function initials(name: string): string {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("");
  return letters.toLocaleUpperCase("tr-TR") || "?";
}

// Status cards keep the current search and city; only the status changes.
function filterHref(q: string, city: string, status: string): string {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (city) query.set("il", city);
  if (status) query.set("f", status);
  const text = query.toString();
  return text ? `/admin?${text}` : "/admin";
}

function StatusPill({ firm }: { firm: Firm }) {
  return firm.status === "published"
    ? <span className="adm-pill adm-pill--live"><span className="adm-dot" aria-hidden="true" />Yayında</span>
    : <span className="adm-pill adm-pill--draft"><span className="adm-dot" aria-hidden="true" />Taslak</span>;
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!adminConfigured()) {
    return <div className="adm-card adm-login"><h1>Yönetim Paneli</h1><p className="adm-alert adm-alert--error">{ADMIN_SETUP_HINT}</p></div>;
  }
  if (!(await isAdmin())) return <LoginForm />;

  const params = await searchParams;
  const notice = NOTICES[one(params.durum)];
  const q = one(params.q).slice(0, 100).trim();
  const statusKey = one(params.f) in STATUS_FILTERS ? one(params.f) : "";
  const statusFilter = STATUS_FILTERS[statusKey];
  // Only registered cities (SQLite); anything else means "all".
  const cityParam = one(params.il);
  const cityNames = supportedCities();
  const city = cityNames.includes(cityParam) ? cityParam : "";

  const firms = listFirms();
  const published = firms.filter((firm) => firm.status === "published").length;
  const drafts = firms.length - published;

  const needle = norm(q);
  const shown = firms.filter((firm) =>
    (!statusFilter || firm.status === statusFilter)
    && (!city || firm.city === city)
    && (!needle || norm(firm.name).includes(needle)));

  const cards = [
    { key: "", label: "Toplam firma", count: firms.length, dot: null },
    { key: "yayinda", label: "Yayında", count: published, dot: "#1F9D55" },
    { key: "taslak", label: "Taslak", count: drafts, dot: "#E08A00" },
  ];

  return (
    <div className="adm-list">
      <div className="adm-list__head">
        <div>
          <h1>Firmalar</h1>
          <p className="adm-muted">Firma kayıtları üç sitede ortaktır; yapılan değişiklikler endustriyelsuaritma.tr, safsuaritmacihazi.tr ve suyumusatmacihazi.tr’ye birlikte yansır.</p>
        </div>
        <a href="/admin/firmalar/yeni" className="adm-btn adm-btn--primary adm-btn--tall">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Yeni Firma Ekle
        </a>
      </div>

      {notice && <p className={`adm-alert adm-alert--${notice.kind}`} role="status">{notice.text}</p>}

      <nav className="adm-stats" aria-label="Duruma göre filtrele">
        {cards.map((card) => (
          <a key={card.label} href={filterHref(q, city, card.key)} className="adm-stat"
            aria-current={statusKey === card.key ? "true" : undefined}>
            <span className="adm-stat__label">
              {card.dot
                ? <span className="adm-stat__dot" style={{ background: card.dot }} aria-hidden="true" />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0013A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5" /></svg>}
              {card.label}
            </span>
            <span className="adm-stat__count">{card.count}</span>
          </a>
        ))}
      </nav>

      <section className="adm-panel" aria-labelledby="liste-baslik">
        <div className="adm-panel__bar">
          <h2 id="liste-baslik">Firma listesi</h2>
          <form method="get" action="/admin" className="adm-filters" role="search">
            <div className="adm-search">
              <label htmlFor="ara" className="adm-sr">Firma adına göre ara</label>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6B80" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <input id="ara" type="search" name="q" defaultValue={q} maxLength={100} placeholder="Firma adına göre ara" />
            </div>
            <label className="adm-filter">İl
              <select name="il" defaultValue={city} className="adm-filter__city">
                <option value="">Tüm iller</option>
                {cityNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="adm-filter">Durum
              <select name="f" defaultValue={statusKey}>
                <option value="">Tüm durumlar</option>
                <option value="yayinda">Yayında</option>
                <option value="taslak">Taslak</option>
              </select>
            </label>
            <button type="submit" className="adm-btn adm-btn--tall">Uygula</button>
            {(q || city || statusKey) &&<a href="/admin" className="adm-link">Temizle</a>}
          </form>
        </div>

        {firms.length === 0 ? (
          <div className="adm-empty">
            <p>Henüz firma eklenmedi.</p>
            <a href="/admin/firmalar/yeni" className="adm-btn adm-btn--primary">İlk firmayı ekle</a>
          </div>
        ) : shown.length === 0 ? (
          <div className="adm-empty">
            <p>Aramanıza uyan firma bulunamadı.</p>
            <a href="/admin" className="adm-btn">Filtreleri temizle</a>
          </div>
        ) : (
          <div className="adm-rows-scroll">
            <div className="adm-rows">
              <div className="adm-row adm-row--head" aria-hidden="true">
                <span>Firma</span><span>İl</span><span>Yayın durumu</span><span className="adm-right">İşlem</span>
              </div>
              <ul className="adm-rows__list">
                {shown.map((firm) => {
                  const ready = validateFirm(firm as unknown as Record<string, unknown>, "publish").valid;
                  const logoPath = firmLogoPath(firm);
                  const tone = AVATAR_TONES[firm.id % AVATAR_TONES.length];
                  return (
                    <li key={firm.id} className="adm-row">
                      <div className="adm-row__firm">
                        <span className="adm-avatar" style={{ background: tone.bg, color: tone.fg }} aria-hidden="true">
                          {logoPath
                            ? <img src={logoPath} alt="" width={36} height={36} loading="lazy" style={{ objectFit: "contain" }} />
                            : initials(firm.name)}
                        </span>
                        <a href={`/admin/firmalar/${firm.id}`} className="adm-row__name">{firm.name}</a>
                      </div>
                      <span className="adm-row__city"><span className="adm-sr">İl: </span>{firm.city}</span>
                      <span>
                        <StatusPill firm={firm} />
                        {firm.status === "draft" && !ready && <small className="adm-muted adm-block">Eksik bilgi var</small>}
                      </span>
                      <span className="adm-row__actions">
                        <a href={`/admin/firmalar/${firm.id}`} className="adm-btn adm-btn--small adm-btn--outline" aria-label={`${firm.name} firmasını düzenle`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></svg>
                          Düzenle
                        </a>
                        <form action={setStatusAction}>
                          <input type="hidden" name="id" value={firm.id} />
                          {firm.status === "published" ? (
                            <button name="status" value="draft" className="adm-btn adm-btn--small adm-btn--warn">Yayından kaldır</button>
                          ) : (
                            <button name="status" value="published" className="adm-btn adm-btn--small adm-btn--primary"
                              title={ready ? undefined : "Eksik alanlar düzenleme ekranında gösterilir"}>
                              Yayınla
                            </button>
                          )}
                        </form>
                        {firm.status === "draft" ? (
                          <DeleteDraftForm id={firm.id} name={firm.name} />
                        ) : (
                          <a href={firmProfilePath(firm)} target="_blank" rel="noopener" className="adm-btn adm-btn--small adm-btn--outline">Firma Sayfasını Aç ↗</a>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {firms.length > 0 && <p className="adm-panel__foot" role="status">Gösterilen: {shown.length} / {firms.length} firma</p>}
      </section>
    </div>
  );
}
