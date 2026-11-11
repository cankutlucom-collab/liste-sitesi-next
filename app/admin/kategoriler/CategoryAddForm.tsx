"use client";

import { useState } from "react";
import { createCategoryAction } from "./actions";
import { categoryTitleForm, slugifyCity } from "../../../lib/cities";

const NAME_MAX = 60;

/** Words to suggest as the page name: a typed phrase, or a finished address read back as words. */
function pageNameFrom(text: string): string {
  const words = text.includes(" ") || /[^\u0000-\u007F]/.test(text) ? text : text.replaceAll("-", " ");
  return categoryTitleForm(words);
}

export default function CategoryAddForm() {
  const [urlText, setUrlText] = useState("");
  const [phrase, setPhrase] = useState("");
  const [pageName, setPageName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);

  const slug = slugifyCity(urlText);
  const shownName = nameEdited ? pageName : pageNameFrom(phrase || urlText);

  return (
    <form action={createCategoryAction} className="adm-form">
      <h2 id="kategori-ekle" style={{ margin: 0 }}>Kategori ekle</h2>
      <div className="adm-field">
        <label htmlFor="yeni-kategori">URL</label>
        <input
          id="yeni-kategori"
          name="slug"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          spellCheck={false}
          placeholder="endüstriyel su arıtma cihazı"
          value={urlText}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setUrlText(value);
            if (!nameEdited && (/[^\u0000-\u007F]/.test(value) || value.includes(" "))) setPhrase(value);
          }}
          onBlur={() => {
            if (slug) setUrlText(slug);
          }}
        />
        <small>
          {slug
            ? <>Adres kuralı uygulanır: <strong>/{slug}</strong></>
            : "Yazdığınız metin küçük harf ve tire ile adrese çevrilir. Örnek: endüstriyel su arıtma cihazı → /endustriyel-su-aritma-cihazi"}
        </small>
      </div>
      <div className="adm-field">
        <label htmlFor="yeni-kategori-ad">Sayfa adı</label>
        <input
          id="yeni-kategori-ad"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={NAME_MAX}
          autoComplete="off"
          value={shownName}
          onChange={(event) => {
            setNameEdited(true);
            setPageName(event.currentTarget.value);
          }}
        />
        <small>URL’deki metinden doldurulur. İstediğiniz sayfa adını yazıp değiştirebilirsiniz.</small>
      </div>
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--primary">Kategori ekle</button>
      </div>
    </form>
  );
}
