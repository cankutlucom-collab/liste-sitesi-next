"use client";

import { useState } from "react";
import { createCityAction } from "./actions";
import { CATEGORY_PATH, categoryTitleForm, slugifyCity } from "../../../../lib/cities";

const NAME_MAX = 40;

/** Words to suggest as the page name: a typed phrase, or a finished address read back as words. */
function pageNameFrom(text: string): string {
  const words = text.includes(" ") || /[^\u0000-\u007F]/.test(text) ? text : text.replaceAll("-", " ");
  return categoryTitleForm(words);
}

export default function CityAddForm() {
  const [urlText, setUrlText] = useState("");
  const [phrase, setPhrase] = useState("");
  const [pageName, setPageName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);

  const slug = slugifyCity(urlText);
  const shownName = nameEdited ? pageName : pageNameFrom(phrase || urlText);

  return (
    <form action={createCityAction} className="adm-form">
      <h2 id="sehir-ekle" style={{ margin: 0 }}>Şehir ekleme</h2>
      <div className="adm-field">
        <label htmlFor="yeni-sehir">URL</label>
        <input
          id="yeni-sehir"
          name="slug"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          spellCheck={false}
          placeholder="afyon karahisar"
          value={urlText}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setUrlText(value);
            // The remembered phrase always follows the current URL text, so an old page name never stays behind.
            setPhrase(/[^\u0000-\u007F]/.test(value) || value.includes(" ") ? value : "");
          }}
          onBlur={() => {
            if (slug) setUrlText(slug);
          }}
        />
        <small>
          {slug
            ? <>Adres kuralı uygulanır: <strong>{CATEGORY_PATH}/{slug}</strong></>
            : `Yazdığınız metin küçük harf ve tire ile adrese çevrilir. Örnek: afyon karahisar → ${CATEGORY_PATH}/afyon-karahisar`}
        </small>
      </div>
      <div className="adm-field">
        <label htmlFor="yeni-sehir-ad">Sayfa adı</label>
        <input
          id="yeni-sehir-ad"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={NAME_MAX}
          autoComplete="off"
          value={shownName}
          onChange={(event) => {
            const value = event.currentTarget.value;
            // Hand-written name is kept; if the field is emptied it goes back to following the URL text.
            setNameEdited(value !== "");
            setPageName(value);
          }}
        />
        <small>URL’deki metinden doldurulur. İstediğiniz sayfa adını yazıp değiştirebilirsiniz.</small>
      </div>
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--primary">Şehir ekle</button>
      </div>
    </form>
  );
}
