/*
 * The site's only contact detail. The design files (app/*.json) keep their "[YÖNETİM TELEFONU]" /
 * "[YÖNETİM E-POSTASI]" placeholders untouched; applySiteContact() rewrites them at render time and is
 * called from linkPolicyPages(), which every design page already passes through.
 *
 * No phone number: the telephone line/span is removed. Firm profile contact data is not affected.
 */

export const SITE_CONTACT_EMAIL = "suaritmafirmalari@gmail.com";

const MAILTO = `mailto:${SITE_CONTACT_EMAIL}`;

export function applySiteContact(html: string): string {
  return html
    // Iletisim Bilgileri card: the whole Telefon row (a <li> holding the phone placeholder) goes away.
    .replace(/<li\b(?:(?!<li\b|<\/li>)[\s\S])*?\[YÖNETİM TELEFONU\][\s\S]*?<\/li>\s*/g, "")
    // Footer "İletişim" box: the phone span goes away.
    .replace(/<span>\[YÖNETİM TELEFONU\]<\/span>\s*/g, "")
    // Card: placeholder link becomes the mailto link, keeping the design's link style.
    .replace(/<a href="#"((?: style="[^"]*")?)>\[YÖNETİM E-POSTASI\]<\/a>/g,
      (_a, style: string) => `<a href="${MAILTO}"${style}>${SITE_CONTACT_EMAIL}</a>`)
    // Footer box: plain span becomes a mailto link that looks like the surrounding text.
    .replace(/<span>\[YÖNETİM E-POSTASI\]<\/span>/g,
      `<span><a href="${MAILTO}" style="color: inherit; text-decoration: none">${SITE_CONTACT_EMAIL}</a></span>`);
}
