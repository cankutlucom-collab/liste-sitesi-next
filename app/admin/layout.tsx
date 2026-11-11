import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isAdmin } from "../../lib/auth";
import { logoutAction } from "./actions";
import AdminSidebar from "./AdminSidebar";

export const metadata: Metadata = {
  title: "Yönetim Paneli | Su Arıtma Cihazı Firmaları",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authed = await isAdmin();
  return (
    <div className="adm">
      <link rel="stylesheet" href="/admin.css" />
      <header className="adm-top">
        <a href="/admin" className="adm-brand">
          <span className="adm-brand__mark" aria-hidden="true">SA</span>
          <span>Su Arıtma Rehberi <small>Yönetim</small></span>
        </a>
        {authed && (
          <div className="adm-top__nav">
            <a href="/su-yumusatma-cihazi" target="_blank" rel="noopener">Şehir listeleri ↗</a>
            <form action={logoutAction}>
              <button type="submit" className="adm-btn adm-btn--ghost">Çıkış</button>
            </form>
          </div>
        )}
      </header>
      {authed ? (
        <div className="adm-shell">
          <AdminSidebar />
          <main className="adm-main">{children}</main>
        </div>
      ) : (
        <main className="adm-main">{children}</main>
      )}
    </div>
  );
}
