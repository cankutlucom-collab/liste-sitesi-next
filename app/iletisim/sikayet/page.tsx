import type { Metadata } from "next";
import Script from "next/script";
import { RECORD_REPORT_NOTICE, replaceFormNotice } from "../../../lib/policies";
import { prepareContactDesign } from "../contact-design";
import views from "./design.json";

export const metadata: Metadata = {"title":"Şikâyet Formu | Su Arıtma Cihazı Firmaları","description":"Rehberdeki bir firmayla ilgili şikâyetinizi yönetime iletin."};

function connectForm(view: string) {
  const html = prepareContactDesign(view)
    .replace("<form ", '<form method="post" action="/iletisim/sikayet/gonder" data-complaint ')
    .replace(/id="[dm]-s-(ad|tel|eposta|firma|konu|tarih|aciklama)"/g, (id, field) => `${id} name="${field}"`);
  // No complaint-specific approved notice exists; the approved "Kayıt bildirimi" notice is used.
  return replaceFormNotice(html, "data-complaint", RECORD_REPORT_NOTICE);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ sonuc?: string }> }) {
  const { sonuc } = await searchParams;
  const message = sonuc === "alindi" ? "Şikâyetiniz alındı ve yönetime iletildi."
    : sonuc === "gecersiz" ? "Şikâyet kaydedilmedi. Lütfen formdaki bilgileri kontrol edin."
    : sonuc === "hata" ? "Şikâyet kaydedilemedi. Lütfen tekrar deneyin." : "";
  return <>
    <link rel="stylesheet" href="/design.css" />
    {message && <p role="status" style={{ padding: "12px 20px", background: "#EEF1FF" }}>{message}</p>}
    <div className="desktop-design" dangerouslySetInnerHTML={{ __html: connectForm(views[0]) }} />
    <div className="mobile-design" dangerouslySetInnerHTML={{ __html: connectForm(views[1]) }} />
    <Script src="/design.js" strategy="afterInteractive" />
  </>;
}
