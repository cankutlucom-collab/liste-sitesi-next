import { POLICY_PATHS } from "./policies";
import { H2, sitePageHtml } from "./profile";

/*
 * Public policy pages built from the approved source texts in "Yayin Metinleri" (not modified).
 *
 * Wording is kept as approved. Clauses that describe functionality the site does not have yet
 * (offer form, accounts/e-mail verification, claimed-profile state, online KVKK form, cookie banner,
 * analytics/ads/maps tools, promotional e-mails) are left out; see the stage report for the exact
 * list. "(BİLGİ EKLENECEK)" placeholders are kept verbatim: those facts are not decided yet and
 * must not be invented here. The "Hata Bildir / Kaydı Kaldır" link name in the sources is shown as
 * the profile's actual button label, "Firmayı Kaldır".
 */

const P = "margin: 0; font-size: 16px; line-height: 1.65; color: #1F2A44";
const LINK = "color: #0013A3";
const TABLE = "width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.5; color: #1F2A44";
const CELL = "border: 1px solid #DCE3EC; padding: 10px 12px; text-align: left; vertical-align: top";
const TODO = "<strong>(BİLGİ EKLENECEK)</strong>";

const link = (path: string, text: string) => `<a href="${path}" style="${LINK}">${text}</a>`;
const h2 = (text: string) => `<h2 style="${H2}">${text}</h2>`;
const p = (html: string) => `<p style="${P}">${html}</p>`;

function table(headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th scope="col" style="${CELL}; background: #F4F5FF; color: #0A1466">${h}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((c) => `<td style="${CELL}">${c}</td>`).join("")}</tr>`).join("\n");
  return `<div style="overflow-x: auto"><table style="${TABLE}"><thead><tr>${head}</tr></thead><tbody>\n${body}\n</tbody></table></div>`;
}

export type PolicyKey = keyof typeof POLICY_PATHS;

export const POLICY_TITLES: Record<PolicyKey, string> = {
  kvkk: "KVKK Aydınlatma Metni",
  terms: "Kullanım Koşulları",
  cookies: "Çerez Bilgilendirmesi",
  kvkkApplication: "KVKK Başvurusu",
};

/* ---------- 01-KVKK-Aydinlatma.md ---------- */
function kvkk(): string {
  return [
    h2("Veri sorumlusu"),
    p(`Firma Rehberi kapsamında kişisel verileriniz, veri sorumlusu ${TODO} tarafından işlenir. Yazılı başvuru adresimiz ${TODO}, KVKK başvuru e-posta adresimiz ${TODO}.`),
    h2("Hangi bilgileri, nasıl ve neden işliyoruz?"),
    // Omitted rows: "Teklif talebi", "Firma hesabı ve profil yönetimi", "Site kullanımı ve tanıtım".
    table(["İşlem", "Veriler ve elde edilme yöntemi", "Amaç ve hukuki sebep"], [
      ["Dış kaynaklardan derlenen kayıtlar",
        "İşletmelerin internet siteleri ve diğer kamuya açık web kaynaklarından derlenen firma bilgileri",
        "Rehberde işletme profili oluşturulması. Kişisel veri niteliği taşıyan alanlar bakımından elde etme ve yayımlama koşulları (BİLGİ EKLENECEK)."],
      ["Bildirim ve KVKK başvurusu",
        "Bildirim formu ve KVKK başvuru kanallarından iletilen iletişim ve talep bilgileri ile gerekli ekler",
        "Bildirimin incelenmesi ve yanıtlanması. KVKK başvurularında kanuni yükümlülüğün yerine getirilmesi. Diğer bildirimlerde hukuki sebep (BİLGİ EKLENECEK)."],
      ["Premium listeleme",
        "Sipariş, banka hareketi ve faturalandırma sırasında elde edilen işlem bilgileri",
        "Ödemenin eşleştirilmesi, hizmetin sağlanması ve mali yükümlülüklerin yerine getirilmesi. İşlem bazında hukuki sebep (BİLGİ EKLENECEK)."],
    ]),
    h2("Kimlerle paylaşıyoruz?"),
    // Omitted: offer-form sharing/retention paragraph and the provider-recipients sentence.
    p("Profilde yayımlanan genel işletme iletişim bilgilerini site ziyaretçileri görebilir. Kanunen yetkili kurumlarla, ilgili yasal yükümlülük kapsamında bilgi paylaşılabilir."),
    h2("Haklarınız"),
    p("KVKK’nın 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenebilir, işlenmişse bilgi isteyebilir, işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenebilirsiniz. Verilerin yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri öğrenebilir, eksik veya yanlış bilgilerin düzeltilmesini ve kanuni koşullar oluştuğunda verilerinizin silinmesini veya yok edilmesini isteyebilirsiniz. Düzeltme, silme veya yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini talep edebilirsiniz. Yalnızca otomatik analiz sonucunda aleyhinize ortaya çıkan sonuca itiraz edebilir ve kanuna aykırı işleme nedeniyle uğradığınız zararın giderilmesini isteyebilirsiniz."),
    p(`Başvuru yöntemlerini ${link(POLICY_PATHS.kvkkApplication, "KVKK Başvurusu")} sayfasında bulabilirsiniz.`),
  ].join("\n");
}

/* ---------- 02-Kullanim-Kosullari.md ---------- */
function terms(): string {
  return [
    h2("İşletmeci ve hizmet"),
    p(`Firma Rehberi, ${TODO} tarafından işletilir. Destek iletişim adresi ${TODO}.`),
    // "ve seçtiğiniz firmadan teklif istemenize" omitted (no offer form).
    p("Rehber, işletmeleri bulmanıza ve genel iletişim bilgilerine ulaşmanıza imkân sağlar. Profil bilgileri kamuya açık web kaynaklarından derlenebilir veya firma temsilcileri tarafından girilebilir. Firma bilgileri zamanla değişebilir. Yanlış veya güncel olmayan bir bilgiyi profil üzerindeki <strong>Firmayı Kaldır</strong> bağlantısından iletebilirsiniz."),
    // Heading was "Hesap açma ve firma kaydı"; accounts and e-mail verification do not exist.
    h2("Firma kaydı"),
    p("Yalnızca adına işlem yapmaya yetkili olduğunuz firmalar için kayıt oluşturabilir, sahiplenme talebi gönderebilir veya profil değişikliği isteyebilirsiniz. Doğru ve güncel bilgi girin. Yayımlama yetkiniz bulunmayan kişisel iletişim bilgilerini, logo veya diğer içerikleri paylaşmayın."),
    // Omitted: claimed-profile button behaviour and the "düzenleme yetkisini askıya alabilir" sentence.
    p("Yeni kayıtlar ve profil değişiklikleri site yönetiminin onayından sonra yayımlanır. Onay, kayıt bilgilerinin veya firma temsil yetkisinin doğrulandığı anlamına gelmez."),
    // Omitted: "Teklif talepleri" section (no offer form).
    h2("Premium listeleme"),
    p(`Temel listeleme ücretsizdir. Premium listeleme ve diğer ücretli hizmetlerin kapsamı, fiyatı, süresi, başlangıç koşulları ve iptal veya iade şartları ${TODO}. Ödeme havale veya EFT ile yapılır ve banka hareketlerinden kontrol edilir. Site üzerinden dekont yüklenmez.`),
    p(`Kişisel verilerin işlenmesi hakkında ${link(POLICY_PATHS.kvkk, "KVKK Aydınlatma Metni")} sayfasını inceleyebilirsiniz.`),
  ].join("\n");
}

/* ---------- 03-Cerez-Bilgilendirmesi.md ---------- */
function cookies(): string {
  return [
    p("<strong>Veri sorumlusu</strong> (BİLGİ EKLENECEK)"),
    p("Çerezler ve benzeri teknolojiler, sitemizin çalışması, tercihlerin hatırlanması, ziyaretlerin ölçülmesi veya reklamların etkinliğinin değerlendirilmesi gibi amaçlarla kullanılabilir. Bu araçlar, tarayıcınız ve site kullanımınız hakkında bilgi toplayabilir."),
    // Omitted rows: Analitik (Google Analytics), Reklam ve ölçüm (Google Ads, Meta Pixel), Harita
    // (Google Haritalar) and the consent/banner paragraph — none of these tools or the banner exist.
    table(["Kategori", "Kullanım amacı", "Kullanılan araçlar ve ayrıntılar"], [
      ["Zorunlu", "Sitenin gerekli işlevlerini ve güvenliğini sağlamak, geçerli tercihleri hatırlamak",
        "Ad, sağlayıcı, birinci veya üçüncü taraf niteliği, süre ve hukuki sebep (BİLGİ EKLENECEK)."],
    ]),
    p(`Kişisel verilerinize ilişkin haklar ve başvuru yöntemleri ${link(POLICY_PATHS.kvkk, "KVKK Aydınlatma Metni")} ve ${link(POLICY_PATHS.kvkkApplication, "KVKK Başvurusu")} sayfalarında yer alır.`),
  ].join("\n");
}

/* ---------- 04-KVKK-Basvurusu.md ---------- */
function kvkkApplication(): string {
  const item = (label: string, html: string) => `<li><strong>${label}:</strong> ${html}</li>`;
  return [
    p(`6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 11. maddesi kapsamındaki haklarınızı kullanmak için veri sorumlusu ${TODO} ile aşağıdaki kanallardan iletişime geçebilirsiniz.`),
    // Omitted: "Çevrim içi başvuru" (no online KVKK form exists).
    `<ul style="${P}; padding-left: 22px; display: flex; flex-direction: column; gap: 6px">`,
    item("E-posta", `Daha önce bize bildirdiğiniz ve sistemimizde kayıtlı olan e-posta adresinizden ${TODO} adresine başvurunuzu iletin.`),
    item("Yazılı başvuru", `İmzalı başvurunuzu ${TODO} adresine iletin.`),
    item("Varsa diğer elektronik başvuru kanalları", `KEP, güvenli elektronik imza veya mobil imza ile başvuru bilgileri ${TODO}.`),
    "</ul>",
    p("Başvurunuzda adınızı ve soyadınızı, yazılı başvuruda imzanızı, T.C. kimlik numaranızı veya yabancı uyrukluysanız uyruğunuzu ve pasaport numaranızı ya da varsa kimlik numaranızı belirtin. Tebligata esas yerleşim yeri veya iş yeri adresinizi, varsa bildirime esas e-posta, telefon ve faks bilgilerinizi ve talebinizin konusunu ekleyin. Varsa talebinizle ilgili belgeleri başvurunuza ekleyebilirsiniz."),
    p("Başvurunuzu talebin niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırırız. Başvurunun sonuçlandırılması kural olarak ücretsizdir. İşlem ayrıca bir maliyet gerektirirse Kurulun belirlediği tarifedeki ücret uygulanabilir."),
    p("Firma profilindeki bir bilgiyi bildirmek için ilgili profil üzerindeki <strong>Firmayı Kaldır</strong> bağlantısını da kullanabilirsiniz."),
  ].join("\n");
}

const BODIES: Record<PolicyKey, () => string> = { kvkk, terms, cookies, kvkkApplication };

export function buildPolicyPageHtml(key: PolicyKey): string {
  const main = `
<main id="ana-icerik" style="max-width: 820px; margin: 0 auto; padding: 36px 24px 72px; display: flex; flex-direction: column; gap: 18px">
<h1 style="margin: 0; font-size: clamp(26px, 5vw, 34px); line-height: 1.2; color: #0A1466">${POLICY_TITLES[key]}</h1>
${BODIES[key]()}
</main>
`;
  return sitePageHtml(main);
}
