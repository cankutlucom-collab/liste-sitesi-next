"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveFirmAction, type FirmFormState } from "./actions";
import { DEFAULT_CITY, cityPagePath, type City } from "../../lib/cities";
import type { Firm, FirmInput } from "../../lib/firms";
import { NO_PACKAGE_LABEL, PACKAGE_LEVELS, packageLabel } from "../../lib/packages";

type Notice = { text: string; kind: "ok" | "error" };

type Props = {
  /** Registered cities (SQLite), read on the server: the only choices the city select offers. */
  cities: City[];
  /** Registered categories (SQLite), read on the server: the slug is submitted, the page name is shown. */
  categories: { slug: string; name: string }[];
  /** Categories the saved firm is linked to; for a new firm the preselected default. */
  firmCategories: string[];
  firm?: Firm;
  publicProfilePath?: string;
  /** Keys that fail publish validation for the saved record (computed on the server). */
  missing: string[];
  /** Pre-formatted "last updated" text (formatted on the server to avoid timezone drift). */
  updatedLabel?: string;
  /** Result notice from the previous redirect (?durum=…). */
  notice?: Notice;
};

type FieldDef = {
  key: keyof FirmInput;
  label: string;
  publishRequired: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  multiline?: boolean;
  maxLength?: number;
};

const FIELDS: FieldDef[] = [
  { key: "name", label: "Firma adı", publishRequired: true, placeholder: "Örn. Akyol Arıtma Teknolojileri", autoComplete: "organization" },
  { key: "phone", label: "Telefon", publishRequired: true, type: "tel", placeholder: "0312 123 45 67", autoComplete: "tel" },
  { key: "email", label: "E-posta", publishRequired: true, type: "email", placeholder: "info@firma.com.tr", autoComplete: "email" },
  { key: "address", label: "Adres", publishRequired: true, multiline: true, placeholder: "Mahalle, cadde/sokak, no, ilçe", autoComplete: "street-address" },
  { key: "whatsapp", label: "WhatsApp", publishRequired: false, type: "tel", placeholder: "0532 123 45 67" },
  { key: "website", label: "Web sitesi", publishRequired: false, type: "url", placeholder: "www.firma.com.tr", autoComplete: "url" },
  { key: "mapUrl", label: "Harita", publishRequired: false, type: "url", placeholder: "Google Maps bağlantısı (https://maps.app.goo.gl/…)" },
  { key: "shortDescription", label: "Kısa tanıtım", publishRequired: false, multiline: true, maxLength: 300, placeholder: "Firmanızı 1–2 cümleyle tanıtın (isteğe bağlı, en fazla 300 karakter)" },
];

const DEF = Object.fromEntries(FIELDS.map((def) => [def.key, def])) as Record<keyof FirmInput, FieldDef>;
const CITY_LABEL = "Şehir";
const SHORT_MAX = DEF.shortDescription.maxLength ?? 300;

// Publish checklist order: required fields as flagged above (city is always publish-required).
const CHECKLIST: { key: keyof FirmInput; label: string }[] = [
  { key: "name", label: DEF.name.label },
  { key: "city", label: CITY_LABEL },
  ...FIELDS.filter((def) => def.publishRequired && def.key !== "name").map((def) => ({ key: def.key, label: def.label })),
];

const ICON_ALERT = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></svg>
);
const ICON_OK = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>
);

export default function FirmForm({ cities, categories, firmCategories, firm, publicProfilePath, missing, updatedLabel, notice }: Props) {
  const isSupportedCity = (name: string) => cities.some((entry) => entry.name === name);
  const [state, action, pending] = useActionState<FirmFormState, FormData>(saveFirmAction, { errors: {} });
  const values: Partial<FirmInput> = state.values ?? firm ?? {};
  const [selectedPackage, setSelectedPackage] = useState<string>(values.packageLevel ?? "");
  const published = firm?.status === "published";
  const title = firm ? firm.name : "Yeni Firma Ekle";

  // Character counter for the short description (React resets the form after each action; re-sync).
  const [shortLength, setShortLength] = useState(() => (values.shortDescription ?? "").length);
  useEffect(() => {
    setShortLength((state.values ?? firm)?.shortDescription?.length ?? 0);
  }, [state, firm]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (pending) dialogRef.current?.close();
  }, [pending]);

  const missingSet = new Set(missing);
  const extraMissing = missing.filter((key) => !CHECKLIST.some((item) => item.key === key)) as (keyof FirmInput)[];
  const checklist = [
    ...CHECKLIST,
    ...extraMissing.filter((key) => key in DEF).map((key) => ({ key, label: DEF[key].label })),
  ];
  const missingCount = checklist.filter((item) => missingSet.has(item.key)).length;

  const errorCount = Object.keys(state.errors).length;

  const field = (def: FieldDef, extraClass = "") => {
    const error = state.errors[def.key];
    const id = `firm-${def.key}`;
    const noteId = def.key === "shortDescription" ? `${id}-note` : undefined;
    const describedBy = [noteId, error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined;
    const common = {
      id,
      name: def.key,
      defaultValue: values[def.key] ?? "",
      placeholder: def.placeholder,
      autoComplete: def.autoComplete,
      maxLength: def.maxLength,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
    };
    const label = (
      <label htmlFor={id}>
        {def.label}
        {def.publishRequired ? <em className="adm-req" title="Yayın için zorunlu">*</em> : <small> (isteğe bağlı)</small>}
      </label>
    );
    return (
      <div className={"adm-field" + (error ? " adm-field--error" : "") + (extraClass ? " " + extraClass : "")} key={def.key}>
        {def.key === "shortDescription" ? (
          <div className="adm-fe__labelrow">
            {label}
            <span className="adm-fe__count">{shortLength}/{SHORT_MAX}</span>
          </div>
        ) : label}
        {def.multiline ? <textarea rows={def.key === "shortDescription" ? 3 : 2} {...common}
          onChange={def.key === "shortDescription" ? (event) => setShortLength(event.currentTarget.value.length) : undefined} /> : <input type={def.type ?? "text"} {...common} />}
        {noteId && (
          <span className="adm-fe__hint" id={noteId}>Şehir listesindeki firma kartında, firma adının altında gösterilir.</span>
        )}
        {error && <p className="adm-error" id={`${id}-error`}>{error}</p>}
      </div>
    );
  };

  const cityError = state.errors.city;
  const selectedCity = values.city || DEFAULT_CITY;
  // Saved record's list page (null for a city outside the catalog).
  const savedCity = firm ? cities.find((entry) => entry.name === firm.city) : undefined;
  const savedCityPath = savedCity ? cityPagePath(savedCity.slug) : null;
  const packageError = state.errors.packageLevel;
  const packageNoteId = "firm-packageLevel-note";
  const categoryError = state.categoryError;
  const chosenCategories = new Set(state.categories ?? firmCategories);

  return (
    <form action={action} className="adm-fe" noValidate>
      {firm && <input type="hidden" name="id" value={firm.id} />}

      <nav aria-label="Konum" className="adm-fe__crumbs">
        <a href="/admin">Firmalar</a>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{firm ? firm.name : "Yeni Firma"}</span>
      </nav>

      <div className="adm-fe__head">
        <div className="adm-fe__titles">
          <div className="adm-fe__titlerow">
            <h1>{title}</h1>
            {firm && (published
              ? <span className="adm-pill adm-pill--live"><span className="adm-dot" aria-hidden="true" />Yayında</span>
              : <span className="adm-pill adm-pill--draft"><span className="adm-dot" aria-hidden="true" />Taslak</span>)}
          </div>
          <span className="adm-fe__sub">
            {!firm
              ? "Henüz kaydedilmedi"
              : published
                ? `${firm.city} listesinde yayında${updatedLabel ? " · Son güncelleme: " + updatedLabel : ""}`
                : `Son kayıt: ${updatedLabel ?? "—"}`}
          </span>
        </div>

        <div className="adm-fe__actions">
          {pending && <span className="adm-muted adm-small" aria-live="polite">Kaydediliyor…</span>}
          {!firm && <a href="/admin" className="adm-fe__cancel">Vazgeç</a>}
          {published ? (
            <>
              <button type="button" className="adm-btn adm-btn--tall adm-btn--danger" disabled={pending}
                onClick={() => dialogRef.current?.showModal()}>
                Yayından Kaldır
              </button>
              <button type="submit" name="intent" value="save" className="adm-btn adm-btn--tall adm-btn--primary" disabled={pending}>
                Değişiklikleri Yayınla
              </button>
            </>
          ) : (
            <>
              <button type="submit" name="intent" value="save" className="adm-btn adm-btn--tall adm-fe__secondary" disabled={pending}>
                Taslak Kaydet
              </button>
              <button type="submit" name="intent" value="publish" className="adm-btn adm-btn--tall adm-btn--primary" disabled={pending}>
                Yayınla
              </button>
            </>
          )}
        </div>
      </div>

      {state.message && (
        <div className="adm-fe__banner adm-fe__banner--error" role="alert">
          {ICON_ALERT}
          <span>
            <strong>{state.message}</strong>
            {errorCount > 0 && " Hatalı alanlar kırmızıyla işaretlendi."}
          </span>
        </div>
      )}

      {notice && (
        <div className={`adm-fe__banner adm-fe__banner--${notice.kind === "ok" ? "ok" : "error"}`} role="status">
          {notice.kind === "ok" ? ICON_OK : ICON_ALERT}
          <span>{notice.text}</span>
        </div>
      )}

      {firm && (published ? (
        <div className="adm-fe__banner adm-fe__banner--live">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
          <span className="adm-fe__banner-text">Bu firma yayında. Kaydettiğiniz değişiklikler {firm.city} listesine hemen yansır.</span>
          {savedCityPath && <a href={savedCityPath} target="_blank" rel="noopener">{firm.city} listesini aç ↗</a>}
          {publicProfilePath && <a href={publicProfilePath} target="_blank" rel="noopener">Firma Sayfasını Aç ↗</a>}
        </div>
      ) : (
        <div className="adm-fe__banner adm-fe__banner--draft">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>
          <span>Bu firma taslak durumda ve ziyaretçilere görünmüyor. <strong>Yayınla</strong> dediğinizde seçili şehrin listesine eklenir.</span>
        </div>
      ))}

      <div className="adm-fe__cols">
        <div className="adm-fe__main">
          <section className="adm-fe__card" aria-labelledby="b-temel">
            <div className="adm-fe__cardhead">
              <h2 id="b-temel">Temel bilgiler</h2>
              <span className="adm-fe__hint"><em className="adm-req" aria-hidden="true">*</em> Yayın için zorunlu</span>
            </div>
            <p className="adm-fe__hint adm-fe__note">
              Taslak için yalnızca firma adı gerekir; yayınlamak için işaretli tüm alanlar zorunludur.
            </p>

            {field(DEF.name)}

            {field(DEF.shortDescription)}
          </section>

          <section className="adm-fe__card" aria-labelledby="b-iletisim">
            <h2 id="b-iletisim">İletişim</h2>
            <div className="adm-fe__grid">
              {field(DEF.phone)}
              {field(DEF.email)}
              {field(DEF.whatsapp)}
              {field(DEF.website)}
            </div>
            {field(DEF.address)}
            {field(DEF.mapUrl)}
          </section>

          <section className="adm-fe__card" aria-labelledby="b-paket">
            <div className="adm-fe__cardhead">
              <h2 id="b-paket">Paket</h2>
              <span className="adm-fe__hint">Yalnızca yönetici</span>
            </div>
            <div className={"adm-field adm-fe__narrow" + (packageError ? " adm-field--error" : "")}>
              <label htmlFor="firm-packageLevel">Atanan paket<small> (isteğe bağlı)</small></label>
              <select id="firm-packageLevel" name="packageLevel" value={selectedPackage}
                onChange={(event) => setSelectedPackage(event.currentTarget.value)}
                aria-invalid={packageError ? true : undefined}
                aria-describedby={[packageNoteId, packageError ? "firm-packageLevel-error" : undefined].filter(Boolean).join(" ")}>
                <option value="">{NO_PACKAGE_LABEL}</option>
                {PACKAGE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
              <span className="adm-fe__hint" id={packageNoteId}>
                {firm ? `Kayıtlı paket: ${packageLabel(firm.packageLevel)}. ` : ""}
                Paket elle atanır; yayınlamak için gerekli değildir ve şimdilik listede sıralamayı veya görünümü etkilemez.
              </span>
              {packageError && <p className="adm-error" id="firm-packageLevel-error">{packageError}</p>}
            </div>
          </section>
        </div>

        <aside className="adm-fe__side" aria-label="Şehir, kategori ve yayın kontrolü">
          <section className="adm-fe__card" aria-labelledby="b-secim">
            <h2 id="b-secim" className="adm-sr">Şehir ve kategori</h2>
            <div className="adm-pick">
              <div className={"adm-field" + (cityError ? " adm-field--error" : "")}>
                <label htmlFor="firm-city">{CITY_LABEL}<em className="adm-req" title="Yayın için zorunlu">*</em></label>
                <select id="firm-city" name="city" defaultValue={selectedCity}
                  aria-invalid={cityError ? true : undefined} aria-describedby={cityError ? "firm-city-error" : undefined}>
                  {/* A stored value that is not a registered city stays visible (never silently replaced); saving it fails validation. */}
                  {!isSupportedCity(selectedCity) && <option value={selectedCity}>{selectedCity} (listede yok)</option>}
                  {cities.map((city) => <option key={city.slug} value={city.name}>{city.name}</option>)}
                </select>
                {cityError && <p className="adm-error" id="firm-city-error">{cityError}</p>}
              </div>
              {/* Marker: tells the server the category boxes were part of this submit, so unchecking all is not mistaken for "field missing". */}
              <input type="hidden" name="categoriesPresent" value="1" />
              <fieldset className={"adm-pick__cats" + (categoryError ? " adm-field--error" : "")}
                aria-describedby={categoryError ? "firm-categories-error" : undefined}>
                <legend>Kategori</legend>
                {categories.map((category) => (
                  <label key={category.slug} className="adm-pick__choice">
                    <input type="checkbox" name="categories" value={category.slug} defaultChecked={chosenCategories.has(category.slug)} />
                    <span>{category.name}</span>
                  </label>
                ))}
                {categoryError && <p className="adm-error" id="firm-categories-error">{categoryError}</p>}
              </fieldset>
            </div>
          </section>

          <section className="adm-fe__card" aria-labelledby="b-kontrol">
            <div className="adm-fe__cardhead">
              <h2 id="b-kontrol">Yayın kontrolü</h2>
              <span className={"adm-fe__status " + (missingCount ? "is-missing" : "is-ready")}>
                {missingCount ? `${missingCount} alan eksik` : "Yayına hazır"}
              </span>
            </div>
            <ul className="adm-fe__checks">
              {checklist.map((item) => {
                const bad = missingSet.has(item.key);
                return (
                  <li key={item.key} className={bad ? "is-missing" : "is-ok"}>
                    {bad ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#8A94A6" strokeWidth="2" strokeDasharray="3 3" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1F9D55" /><path d="M7.5 12.5l3 3 6-6.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                    <span>{item.label}</span>
                    <span className="adm-sr">{bad ? "eksik veya hatalı" : "tamam"}</span>
                  </li>
                );
              })}
            </ul>
            <span className="adm-fe__hint">{firm ? "Son kaydedilen bilgilere göre." : "Form henüz kaydedilmedi."}</span>
          </section>
        </aside>
      </div>

      {published && (
        <dialog ref={dialogRef} className="adm-fe__dialog" aria-labelledby="onay-baslik">
          <h2 id="onay-baslik">Firmayı yayından kaldır?</h2>
          <p>{firm?.name} firmasının kartı {firm?.city} listesinden kaldırılır ve ziyaretçilere gösterilmez.</p>
          <p>Formdaki değişiklikler de kaydedilir. Firma kaydı silinmez; taslak olarak saklanır ve daha sonra yeniden yayınlayabilirsiniz.</p>
          <div className="adm-fe__dialog-actions">
            <button type="button" className="adm-btn adm-btn--tall adm-fe__secondary" onClick={() => dialogRef.current?.close()}>
              Vazgeç
            </button>
            <button type="submit" name="intent" value="unpublish" className="adm-btn adm-btn--tall adm-btn--danger-solid" disabled={pending}>
              Yayından Kaldır
            </button>
          </div>
        </dialog>
      )}
    </form>
  );
}
