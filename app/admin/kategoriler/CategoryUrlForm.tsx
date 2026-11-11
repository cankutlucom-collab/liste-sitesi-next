"use client";

import { useState } from "react";
import { renameCategoryAction } from "./actions";
import { slugifyCity } from "../../../lib/cities";

/** Edits the address of an existing category; typed text is turned into an address the same way as on add. */
export default function CategoryUrlForm({ category, locked }: { category: string; locked: boolean }) {
  const [urlText, setUrlText] = useState(category);
  const slug = slugifyCity(urlText);

  return (
    <form action={renameCategoryAction} className="adm-form">
      <input type="hidden" name="category" value={category} />
      <h2 id="kategori-url" style={{ margin: 0 }}>Kategori URL’si</h2>
      <div className="adm-field">
        <label htmlFor="kategori-url-alan">URL</label>
        <input
          id="kategori-url-alan"
          name="slug"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          spellCheck={false}
          disabled={locked}
          value={urlText}
          onChange={(event) => setUrlText(event.currentTarget.value)}
          onBlur={() => {
            if (slug) setUrlText(slug);
          }}
        />
        <small>
          {locked
            ? "Ana kategorinin adresi değiştirilemez."
            : slug
              ? <>Adres kuralı uygulanır: <strong>/{slug}</strong>. Sayfa adı değişmez.</>
              : "Yazdığınız metin küçük harf ve tire ile adrese çevrilir."}
        </small>
      </div>
      {!locked && (
        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary">URL’yi kaydet</button>
        </div>
      )}
    </form>
  );
}
