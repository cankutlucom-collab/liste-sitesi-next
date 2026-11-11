import type { Metadata } from "next";
import Script from "next/script";
import { SITE_TITLE } from "../lib/cities";
import { buildPolicyPageHtml, POLICY_TITLES, type PolicyKey } from "../lib/policy-pages";

/*
 * Shared renderer for the policy routes (/kvkk-aydinlatma-metni, /kullanim-kosullari,
 * /cerez-bilgilendirmesi, /kvkk-basvurusu). Not a route itself.
 * noindex while the texts still contain "(BİLGİ EKLENECEK)" placeholders (launch decision pending).
 */

export function policyMetadata(key: PolicyKey): Metadata {
  return {
    title: `${POLICY_TITLES[key]} | ${SITE_TITLE}`,
    robots: { index: false },
  };
}

export function PolicyPage({ policy }: { policy: PolicyKey }) {
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: buildPolicyPageHtml(policy) }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
