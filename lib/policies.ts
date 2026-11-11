/*
 * Public policy pages (texts from "Yayin Metinleri", approved source texts) and the links that lead
 * to them. Only imports the dependency-free lib/cities.ts: this module only rewrites design HTML.
 *
 * Only the footer placeholders that have an approved page are linked ("KVKK Aydınlatma Metni",
 * "Kullanım Koşulları"). "Gizlilik Politikası" has no approved text and stays a placeholder.
 */

import { linkCategoryIndex } from "./cities";
import { applySiteContact } from "./site-contact";

export const POLICY_PATHS = {
  kvkk: "/kvkk-aydinlatma-metni",
  terms: "/kullanim-kosullari",
  cookies: "/cerez-bilgilendirmesi",
  kvkkApplication: "/kvkk-basvurusu",
} as const;

const FOOTER_LINKS: Record<string, string> = {
  "KVKK Aydınlatma Metni": POLICY_PATHS.kvkk,
  "Kullanım Koşulları": POLICY_PATHS.terms,
};

/**
 * Design footers: `<a href="#" [data-pending="true"] class|style=…>KVKK Aydınlatma Metni</a>` and
 * "Kullanım Koşulları" become real links (data-pending dropped so public/app.js does not open the
 * "sonraki aşamada eklenecek" dialog). The design's form notices link "/kvkk-aydinlatma-metni/";
 * that is normalised to the canonical path without trailing slash.
 */
export function linkPolicyPages(html: string): string {
  // Every design page passes through here, so the retired "/sehirler" menu/footer links are fixed here too.
  return applySiteContact(linkCategoryIndex(html))
    .replace(
      /<a href="#"(?: data-pending="true")?((?: (?:class|style)="[^"]*")*)>(KVKK Aydınlatma Metni|Kullanım Koşulları)<\/a>/g,
      (_link, attrs: string, text: string) => `<a href="${FOOTER_LINKS[text]}"${attrs}>${text}</a>`,
    )
    .replaceAll('href="/kvkk-aydinlatma-metni/"', `href="${POLICY_PATHS.kvkk}"`);
}

/* ---------- approved notices for forms (06-Form-ve-Cerez-Paneli-Metinleri.md) ---------- */

const NOTICE_LINK_STYLE = "color: #0013A3";
const kvkkLink = `<a href="${POLICY_PATHS.kvkk}" style="${NOTICE_LINK_STYLE}">KVKK Aydınlatma Metni</a>`;
const termsLink = `<a href="${POLICY_PATHS.terms}" style="${NOTICE_LINK_STYLE}">Kullanım Koşulları</a>`;

/** "Firma ekleme formu" — the firm application form on /iletisim. */
export const FIRM_APPLICATION_NOTICE =
  "Profil için girdiğiniz genel firma bilgileri, yönetici onayından sonra herkese açık olarak yayımlanır. " +
  "Yalnızca adına işlem yapmaya yetkili olduğunuz firmaya ait, yayımlamaya yetkili olduğunuz bilgileri girin. " +
  `Ayrıntılı bilgi için ${kvkkLink} ve ${termsLink} sayfalarını inceleyin.`;

/** "Kayıt bildirimi" — the Firmayı Kaldır form; also used for the complaint form (see report). */
export const RECORD_REPORT_NOTICE =
  "Paylaştığınız bilgileri bildiriminizi incelemek ve gerektiğinde size ulaşmak için kullanırız. " +
  `Ayrıntılı bilgi için ${kvkkLink} sayfasını inceleyin.`;

/** "Firma kaydını sahiplenme" — the Bu Profili Sahiplen form. */
export const CLAIM_NOTICE =
  "Bu ekranda paylaştığınız bilgileri sahiplenme talebinizi değerlendirmek ve sizinle iletişim kurmak için kullanırız. " +
  "Sahiplenme talebi yönetici onayına tabidir. " +
  `Ayrıntılı bilgi için ${kvkkLink} sayfasını inceleyin.`;

/** The design's unapproved form notice ("Formu göndererek … kabul edersiniz."), with its paragraph style captured. */
const DESIGN_NOTICE =
  /<p style="([^"]*)">Formu göndererek kişisel verilerinizin <a href="\/kvkk-aydinlatma-metni\/?" style="[^"]*">KVKK Aydınlatma Metni<\/a>[^<]*<\/p>/;

/**
 * Replaces the design notice inside the first form whose opening tag carries `formMarker`
 * (e.g. "data-firm-application") with an approved notice, keeping the design's paragraph style.
 */
export function replaceFormNotice(html: string, formMarker: string, notice: string): string {
  const formStart = html.search(new RegExp(`<form [^>]*${formMarker}`));
  if (formStart < 0) return html;
  const formEnd = html.indexOf("</form>", formStart);
  if (formEnd < 0) return html;
  const form = html.slice(formStart, formEnd);
  const replaced = form.replace(DESIGN_NOTICE, (_p, style: string) => `<p style="${style}">${notice}</p>`);
  return html.slice(0, formStart) + replaced + html.slice(formEnd);
}
