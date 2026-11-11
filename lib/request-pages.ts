import { visibleCityPath } from "./city-store";
import { firmProfilePath, type Firm } from "./firms";
import { REPORT_TYPES, type RequestType } from "./firm-requests";
import { escapeHtml } from "./listing";
import { CLAIM_NOTICE, POLICY_PATHS, RECORD_REPORT_NOTICE } from "./policies";
import { BUTTON_PRIMARY, CARD, H2, sitePageHtml } from "./profile";

/*
 * Public form pages behind the profile buttons:
 *   /firmalar/<firma-adi>/sahiplen  "Bu Profili Sahiplen"  (notice: 06 "Firma kaydını sahiplenme")
 *   /firmalar/<firma-adi>/kaldir    "Firmayı Kaldır"       (body: 05-Firma-Kaydi-Bildirimi.md, notice: 06 "Kayıt bildirimi")
 * Both post to /firmalar/<firma-adi>/talep with a hidden request type; the firm comes from the URL slug.
 */

const LABEL = "display: flex; flex-direction: column; gap: 6px; font-size: 15px; font-weight: 600; color: #0A1466";
const INPUT = "font: inherit; font-weight: 400; font-size: 16px; padding: 11px 12px; border: 1px solid #BCC4F0; border-radius: 8px; background: #FFFFFF; color: #1F2A44";
const P = "margin: 0; font-size: 16px; line-height: 1.6; color: #1F2A44";
const NOTICE = "margin: 0; font-size: 13px; color: #5A6B80";
const OPTIONAL = '<span style="font-weight: 400; color: #5A6B80">(isteğe bağlı)</span>';

function field(label: string, control: string, optional = false): string {
  return `<label style="${LABEL}"><span>${label}${optional ? " " + OPTIONAL : ""}</span>${control}</label>`;
}

const input = (name: string, type: string, maxLength: number, required: boolean, autocomplete: string) =>
  `<input name="${name}" type="${type}" maxlength="${maxLength}"${required ? " required" : ""} autocomplete="${autocomplete}" style="${INPUT}">`;

const textarea = (name: string, maxLength: number, required: boolean) =>
  `<textarea name="${name}" rows="5" maxlength="${maxLength}"${required ? " required" : ""} style="${INPUT}; resize: vertical"></textarea>`;

const RESULT_MESSAGES: Record<RequestType, Record<string, string>> = {
  sahiplen: {
    alindi: "Sahiplenme talebiniz alındı ve yönetime iletildi.",
    gecersiz: "Talep kaydedilmedi. Lütfen formdaki bilgileri kontrol edin.",
    hata: "Talep kaydedilemedi. Lütfen tekrar deneyin.",
  },
  kaldir: {
    alindi: "Bildiriminiz alındı ve yönetime iletildi.",
    gecersiz: "Bildirim kaydedilmedi. Lütfen formdaki bilgileri kontrol edin.",
    hata: "Bildirim kaydedilemedi. Lütfen tekrar deneyin.",
  },
};

function claimBody(): { intro: string; fields: string; notice: string; submit: string } {
  return {
    intro: "",
    fields: [
      field("Ad soyad", input("ad", "text", 120, true, "name")),
      field("Firmadaki göreviniz", input("gorev", "text", 120, true, "organization-title")),
      field("Telefon", input("tel", "tel", 30, true, "tel")),
      field("E-posta", input("eposta", "email", 254, true, "email")),
      field("Açıklama", textarea("aciklama", 2000, false), true),
    ].join("\n"),
    notice: CLAIM_NOTICE,
    submit: "Sahiplenme Talebi Gönder",
  };
}

/** 05-Firma-Kaydi-Bildirimi.md, without the clauses about claimed profiles (no ownership exists yet). */
function reportBody(): { intro: string; fields: string; notice: string; submit: string } {
  const kvkkApplication = `<a href="${POLICY_PATHS.kvkkApplication}" style="color: #0013A3">KVKK Başvurusu</a>`;
  return {
    intro: `<p style="${P}">Bir firma profilinde yanlış, güncel olmayan veya yetkisiz biçimde paylaşıldığını düşündüğünüz bir bilgi varsa bize bildirebilirsiniz.</p>
<h2 style="${H2}">Ne bildirebilirsiniz?</h2>
<ul style="${P}; padding-left: 22px; display: flex; flex-direction: column; gap: 6px">
<li><strong>Yanlış veya eski bilgi.</strong> Firma adı, adres, telefon, WhatsApp, e-posta veya web sitesindeki hataları belirtin.</li>
<li><strong>Kişisel iletişim bilgisi.</strong> Size ait telefon veya e-posta gibi bir bilginin profilde yer aldığını ve gizlenmesini ya da kaldırılmasını istediğinizi belirtin.</li>
<li><strong>Kapanan işletme veya mükerrer kayıt.</strong> İlgili profili ve varsa aynı firmaya ait diğer profil bağlantısını paylaşın.</li>
</ul>
<p style="${P}">Bildiriminize profil bağlantısını, bildirim türünü, düzeltilmesini veya kaldırılmasını istediğiniz alanı ve size ulaşabileceğimiz iletişim bilgisini ekleyin. Bildirimi açıklamak için gerekli olmayan kimlik belgelerini veya üçüncü kişilere ait bilgileri paylaşmayın.</p>
<p style="${P}">Site yönetimi bildirimi inceler. Gerektiğinde ek bilgi isteyebilir, ilgili alanı geçici olarak gizleyebilir, düzeltebilir veya kaydı yayından kaldırabilir. Kişisel verilerinize ilişkin KVKK haklarınızı kullanmak için ${kvkkApplication} sayfasından da başvurabilirsiniz.</p>`,
    fields: [
      field("Bildirim türü", `<select name="bildirim-turu" required style="${INPUT}"><option value="">Seçin</option>${
        REPORT_TYPES.map((type) => `<option>${escapeHtml(type)}</option>`).join("")
      }</select>`),
      field("Düzeltilmesini veya kaldırılmasını istediğiniz alan ve açıklama", textarea("aciklama", 5000, true)),
      field("Ad soyad", input("ad", "text", 120, true, "name")),
      field("E-posta", input("eposta", "email", 254, true, "email")),
      field("Telefon", input("tel", "tel", 30, false, "tel"), true),
    ].join("\n"),
    notice: RECORD_REPORT_NOTICE,
    submit: "Bildirimi Gönder",
  };
}

export const REQUEST_PAGE_TITLES: Record<RequestType, string> = {
  sahiplen: "Firma Kaydını Sahiplenme",
  kaldir: "Firma Kaydını Düzeltme veya Kaldırma",
};

export function buildRequestPageHtml(firm: Firm, type: RequestType, result: string | undefined): string {
  const body = type === "sahiplen" ? claimBody() : reportBody();
  const profile = firmProfilePath(firm);
  const name = escapeHtml(firm.name);
  const city = visibleCityPath(firm.city);
  const message = result && Object.hasOwn(RESULT_MESSAGES[type], result) ? RESULT_MESSAGES[type][result] : undefined;
  const sent = result === "alindi";

  const main = `
<main id="ana-icerik" style="max-width: 820px; margin: 0 auto; padding: 28px 24px 72px; display: flex; flex-direction: column; gap: 24px">
<nav aria-label="Konum" style="font-size: 14px; color: #5A6B80">
<ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px">
<li><a href="/" style="color: #0013A3; text-decoration: none">Ana Sayfa</a></li><li aria-hidden="true">›</li>
${city ? `<li><a href="${escapeHtml(city)}" style="color: #0013A3; text-decoration: none">${escapeHtml(firm.city)}</a></li><li aria-hidden="true">›</li>` : ""}
<li><a href="${escapeHtml(profile)}" style="color: #0013A3; text-decoration: none">${name}</a></li><li aria-hidden="true">›</li>
<li aria-current="page" style="color: #3E4F63">${REQUEST_PAGE_TITLES[type]}</li>
</ol>
</nav>
<h1 style="margin: 0; font-size: clamp(26px, 5vw, 34px); line-height: 1.2; color: #0A1466">${REQUEST_PAGE_TITLES[type]}</h1>
<p style="${P}">Firma: <a href="${escapeHtml(profile)}" style="color: #0013A3; font-weight: 600">${name}</a></p>
${message ? `<p role="status" style="margin: 0; padding: 12px 16px; border-radius: 8px; background: #EEF1FF; color: #0A1466">${message}</p>` : ""}
${body.intro}
${sent ? "" : `<form method="post" action="${escapeHtml(profile)}/talep" style="${CARD}">
<input type="hidden" name="talep" value="${type}">
${body.fields}
<p style="${NOTICE}">${body.notice}</p>
<button type="submit" style="font: inherit; ${BUTTON_PRIMARY}; border: 0; cursor: pointer">${body.submit}</button>
</form>`}
<p style="margin: 0"><a href="${escapeHtml(profile)}" style="color: #0013A3">← Firma profiline dön</a></p>
</main>
`;
  return sitePageHtml(main);
}
