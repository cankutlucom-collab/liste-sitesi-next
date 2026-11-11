"use client";

import { usePathname } from "next/navigation";

/**
 * Left vertical navigation (03-firma-listesi … 09). Rendered by the admin layout only for an
 * authenticated session, so it never appears on the login screen. Links only to implemented routes.
 */
export default function AdminSidebar() {
  const path = usePathname() ?? "";
  const onNew = path === "/admin/firmalar/yeni";
  const onList = path === "/admin";
  // Editing an existing firm belongs to the "Tüm Firmalar" section (as in 05–07, 09).
  const inFirms = !onNew && (onList || path.startsWith("/admin/firmalar/"));

  const listCurrent = onList ? "page" : inFirms ? "true" : undefined;

  return (
    <nav className="adm-side" aria-label="Panel menüsü">
      <div className="adm-side__rail">
        <a href="/admin" className="adm-side__icon" aria-label="Firmalar" aria-current={onList ? "page" : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0013A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01M9 13.5h.01M15 13.5h.01" /></svg>
        </a>
      </div>
      <div className="adm-side__list">
        <span className="adm-side__heading">Firmalar</span>
        <a href="/admin" className="adm-side__link" aria-current={listCurrent}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
          Tüm Firmalar
        </a>
        <a href="/admin/firmalar/yeni" className="adm-side__link" aria-current={onNew ? "page" : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
          Yeni Firma Ekle
        </a>
        <span className="adm-side__heading">SEO</span>
        <a href="/admin/seo/sehirler" className="adm-side__link" aria-current={path === "/admin/seo/sehirler" ? "page" : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
          Şehirler
        </a>
        <a href="/admin/kategoriler" className="adm-side__link" aria-current={path === "/admin/kategoriler" ? "page" : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
          Kategoriler
        </a>
        <span className="adm-side__heading">İçerik</span>
        <a href="/admin/bannerlar" className="adm-side__link" aria-current={path === "/admin/bannerlar" ? "page" : undefined}>
          Bannerlar
        </a>
        <span className="adm-side__heading">Formlar</span>
        <a href="/admin/sikayetler" className="adm-side__link" aria-current={path === "/admin/sikayetler" ? "page" : undefined}>
          Şikâyetler
        </a>
        <a href="/admin/basvurular" className="adm-side__link" aria-current={path === "/admin/basvurular" ? "page" : undefined}>
          Firma Başvuruları
        </a>
        <a href="/admin/profil-talepleri" className="adm-side__link" aria-current={path === "/admin/profil-talepleri" ? "page" : undefined}>
          Profil Talepleri
        </a>
      </div>
    </nav>
  );
}
