import { linkCityDirectory, listCities } from "../../lib/city-store";
import { escapeHtml } from "../../lib/listing";
import { FIRM_APPLICATION_NOTICE, linkPolicyPages, replaceFormNotice } from "../../lib/policies";

export function prepareContactDesign(view: string) {
  // The application form's "İl seçin" list offers the registered cities (the route validates against the same table).
  const cityOptions = listCities().map((city) => `<option>${escapeHtml(city.name)}</option>`).join("");
  const html = linkPolicyPages(linkCityDirectory(view))
    .replace(/(<select id="[dm]-merkez-il"[^>]*>)[\s\S]*?(<\/select>)/g, (_, open: string, close: string) =>
      `${open}<option value="">İl seçin</option>${cityOptions}${close}`)
    .replace(/<section aria-labelledby="iletisim-bilgileri"[^>]*>[\s\S]*?<\/section>/g, "")
    .replace(/<span>\[YÖNETİM (?:TELEFONU|E-POSTASI)\]<\/span>/g, "")
    .replace(/(<section id="[dm]-firma-basvurusu"[^>]*>[\s\S]*?)<form /, '$1<form method="post" action="/iletisim/basvuru" data-firm-application ')
    .replace(/id="[dm]-(firma-adi|merkez-il|yetkili|b-tel|b-eposta|adres|tanitim)"/g, (id, field) => `${id} name="${field}"`);
  // Approved "Firma ekleme formu" notice instead of the design's placeholder notice.
  return replaceFormNotice(html, "data-firm-application", FIRM_APPLICATION_NOTICE);
}
