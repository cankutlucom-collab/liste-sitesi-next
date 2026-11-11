"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const SITES = ["endustriyelsuaritma.tr", "safsuaritmacihazi.tr", "suyumusatmacihazi.tr"];

function DropIcon({ size, stroke }: { size: number; stroke: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
    </svg>
  );
}

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const hasError = Boolean(state.error);

  return (
    <div className="adm-auth">
      <section className="adm-auth__aside">
        <div className="adm-auth__brand">
          <span className="adm-auth__mark"><DropIcon size={22} stroke="#FFFFFF" /></span>
          <span className="adm-auth__brand-text">
            <strong>Su Arıtma Rehberi</strong>
            <span>Yönetim Paneli</span>
          </span>
        </div>
        <div className="adm-auth__pitch">
          <h2>Üç site, tek panel.</h2>
          <p>Firma kayıtları, ilanlar ve site içerikleri buradan yönetilir. Yapılan ortak değişiklikler üç sitede birlikte yayınlanır.</p>
          <ul>
            {SITES.map((site) => (
              <li key={site}><DropIcon size={16} stroke="#D3D9FF" />{site}</li>
            ))}
          </ul>
        </div>
        <span className="adm-auth__host">panel.endustriyelsuaritma.tr</span>
      </section>

      <div className="adm-auth__main">
        <form action={action} className="adm-auth__card" noValidate>
          <div className="adm-auth__head">
            <h1>Panele Giriş</h1>
            <p>Devam etmek için yönetici şifresini girin.</p>
          </div>

          {hasError && (
            <div className="adm-auth__alert" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" />
              </svg>
              <div>
                <strong>{state.error}</strong>
                <span>15 dakika içinde 5 hatalı denemede giriş 15 dakika süreyle engellenir.</span>
              </div>
            </div>
          )}

          <div className="adm-auth__field">
            <label htmlFor="adm-password">Şifre</label>
            <div className="adm-auth__pw">
              <input
                id="adm-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Şifreniz"
                required
                autoFocus
                aria-invalid={hasError}
              />
              <button
                type="button"
                className="adm-auth__toggle"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                aria-pressed={showPassword}
                aria-controls="adm-password"
                onClick={() => setShowPassword((value) => !value)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6B80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="adm-auth__submit" disabled={pending}>
            {pending ? "Kontrol ediliyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
