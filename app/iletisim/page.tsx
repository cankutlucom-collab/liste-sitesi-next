import type { Metadata } from "next";
import Script from "next/script";
import { prepareContactDesign } from "./contact-design";
import views from "./design.json";

export const metadata: Metadata = {"title":"İletişim | Su Arıtma Cihazı Firmaları","description":"Su Arıtma Cihazı Firmaları rehberiyle iletişim seçenekleri."};

export default async function Page({ searchParams }: { searchParams: Promise<{ basvuru?: string }> }) {
  const { basvuru } = await searchParams;
  const message = basvuru === "alindi" ? "Firma başvurunuz alındı ve yönetime iletildi."
    : basvuru === "gecersiz" ? "Başvuru kaydedilmedi. Lütfen formdaki bilgileri kontrol edin."
    : basvuru === "hata" ? "Başvuru kaydedilemedi. Lütfen tekrar deneyin." : "";
  return <>
    <link rel="stylesheet" href="/design.css" />
    {message && <p role="status" style={{ padding: "12px 20px", background: "#EEF1FF" }}>{message}</p>}
    <div className="desktop-design" dangerouslySetInnerHTML={{ __html: prepareContactDesign(views[0]) }} />
    <div className="mobile-design" dangerouslySetInnerHTML={{ __html: prepareContactDesign(views[1]) }} />
    <Script src="/design.js" strategy="afterInteractive" />
  </>;
}
