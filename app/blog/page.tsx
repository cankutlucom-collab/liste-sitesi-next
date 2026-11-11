import type { Metadata } from "next";
import Script from "next/script";
import { buildBlogIndexHtml, listPosts } from "../../lib/blog";

/*
 * Public blog index. Lists the markdown posts in content/blog. design.json is not rendered.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | Su Arıtma Cihazı Firmaları",
  description: "Endüstriyel su arıtma rehber yazıları.",
  alternates: { canonical: "/blog" },
};

export default function Page() {
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <div dangerouslySetInnerHTML={{ __html: buildBlogIndexHtml(listPosts()) }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
