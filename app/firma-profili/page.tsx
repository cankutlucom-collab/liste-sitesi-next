import type { Metadata } from "next";
import Script from "next/script";
import { linkPolicyPages } from "../../lib/policies";
import views from "./design.json";

export const metadata: Metadata = {
  title: "Firma Profili | Su Arıtma Cihazı Firmaları",
  description: "Endüstriyel su arıtma firması için örnek profil ve hizmet bilgileri.",
  robots: { index: false },
};

// Design preview: only the footer "Yasal" links (and the notice link path) are made real.
export default function Page() {
  return <>
    <link rel="stylesheet" href="/design.css" />
    <div className="desktop-design" dangerouslySetInnerHTML={{ __html: linkPolicyPages(views[0]) }} />
    <div className="mobile-design" dangerouslySetInnerHTML={{ __html: linkPolicyPages(views[1]) }} />
    <Script src="/design.js" strategy="afterInteractive" />
  </>;
}
