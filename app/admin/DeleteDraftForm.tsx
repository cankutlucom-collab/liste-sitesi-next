"use client";

import { deleteDraftAction } from "./actions";

export default function DeleteDraftForm({ id, name }: { id: number; name: string }) {
  return (
    <form action={deleteDraftAction} onSubmit={(event) => {
      if (!window.confirm(`“${name}” taslağı kalıcı olarak silinsin mi?`)) event.preventDefault();
    }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="adm-btn adm-btn--small adm-btn--danger" aria-label={`${name} taslağını sil`}>Sil</button>
    </form>
  );
}
