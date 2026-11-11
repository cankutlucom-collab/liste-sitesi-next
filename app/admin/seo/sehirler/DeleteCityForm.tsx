"use client";

import { deleteCityAction } from "./actions";

export default function DeleteCityForm({ slug, name }: { slug: string; name: string }) {
  return (
    <form action={deleteCityAction} onSubmit={(event) => {
      if (!window.confirm(`“${name}” şehri ve varsa SEO metinleri/SSS kayıtları kalıcı olarak silinsin mi?`)) event.preventDefault();
    }}>
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className="adm-btn adm-btn--small adm-btn--danger" aria-label={`${name} şehrini sil`}>Sil</button>
    </form>
  );
}
