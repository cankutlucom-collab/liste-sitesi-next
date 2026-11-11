import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { blogJsonLd, buildBlogPostHtml, listPosts, postBySlug } from "../../../lib/blog";

/*
 * /blog/<slug> for each markdown post in content/blog. Unknown slugs answer 404.
 */

export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return listPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  return {
    title: `${post.title} | Su Arıtma Cihazı Firmaları`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  return <>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/responsive.css" />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: blogJsonLd(post) }} />
    <div dangerouslySetInnerHTML={{ __html: buildBlogPostHtml(post) }} />
    <Script src="/app.js" strategy="afterInteractive" />
  </>;
}
