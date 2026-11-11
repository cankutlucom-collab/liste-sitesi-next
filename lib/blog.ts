import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { sitePageHtml } from "./profile";

/*
 * Blog posts: the approved markdown drafts in content/blog (read as-is, never rewritten) rendered at
 * /blog/<slug>. The header/footer are the shared site chrome; the article body follows the look of the
 * blog index at /blog. The old design preview file app/blog/design.json is not the public page.
 *
 * Structured data: Article + BreadcrumbList only. No Product, Offer or HowTo.
 * The drafts carry one date ("updated"), so that is the only date emitted (dateModified).
 * No image and no publisher logo exist, so none are emitted. Absolute URLs need SITE_URL (no live
 * domain is assumed); without it the JSON-LD uses site-relative paths.
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const SITE_NAME = "Su Arıtma Cihazı Firmaları";
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export type BlogPost = { slug: string; title: string; description: string; updated: string; body: string };

function parsePost(file: string): BlogPost | null {
  const raw = readFileSync(path.join(BLOG_DIR, file), "utf8").replace(/^﻿/, "").replaceAll("\r\n", "\n");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const { title, description, slug, updated } = meta;
  // The slug must match the file name so a draft can only answer at its own address.
  if (!title || !description || !slug || !updated || slug !== file.replace(/\.md$/, "")) return null;
  return { slug, title, description, updated, body: match[2] };
}

export function listPosts(): BlogPost[] {
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(parsePost)
    .filter((p): p is BlogPost => p !== null);
}

export function postBySlug(slug: string): BlogPost | undefined {
  return /^[a-z0-9-]+$/.test(slug) ? listPosts().find((p) => p.slug === slug) : undefined;
}

/* ---------- markdown -> html (headings, paragraphs, numbered lists, links) ---------- */

const escapeHtml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const slugify = (s: string) =>
  s.toLocaleLowerCase("tr").replaceAll("ı", "i").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inline(text: string): string {
  return escapeHtml(text).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const external = /^https?:\/\//.test(href);
    return `<a href="${href}" style="color: #0013A3"${external ? ' target="_blank" rel="noopener nofollow"' : ""}>${label}</a>`;
  });
}

const P = "margin: 0; font-size: 18px; line-height: 1.75; color: #2B3850";
const H2 = "margin: 16px 0 0; font-size: 26px; line-height: 1.3; color: #0A1466; scroll-margin-top: 24px";
const H3 = "margin: 8px 0 0; font-size: 20px; line-height: 1.35; color: #0A1466";
const OL = "margin: 0; padding-left: 24px; font-size: 18px; line-height: 1.75; color: #2B3850";

function bodyHtml(markdown: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ol style="${OL}">${list.join("")}</ol>`);
    list = [];
  };
  for (const line of markdown.split("\n")) {
    const text = line.trim();
    const item = /^\d+\.\s+(.*)$/.exec(text);
    if (item) { list.push(`<li>${inline(item[1])}</li>`); continue; }
    flush();
    if (!text || text.startsWith("# ")) continue; // the H1 is rendered from the front matter title
    if (text.startsWith("### ")) out.push(`<h3 style="${H3}">${inline(text.slice(4))}</h3>`);
    else if (text.startsWith("## ")) out.push(`<h2 id="${slugify(text.slice(3))}" style="${H2}">${inline(text.slice(3))}</h2>`);
    else out.push(`<p style="${P}">${inline(text)}</p>`);
  }
  flush();
  return out.join("\n");
}

/* ---------- page ---------- */

const absolute = (p: string) => (process.env.SITE_URL ? process.env.SITE_URL.replace(/\/$/, "") + p : p);

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function blogJsonLd(post: BlogPost): string {
  const url = absolute(`/blog/${post.slug}`);
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      dateModified: post.updated,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: SITE_NAME },
      publisher: { "@type": "Organization", name: SITE_NAME },
      inLanguage: "tr",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: absolute("/") },
        { "@type": "ListItem", position: 2, name: "Blog", item: absolute("/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  // "<" is escaped so the payload can never close the script element.
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

export function buildBlogIndexHtml(posts: BlogPost[]): string {
  const cards = posts
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, "tr"))
    .map((post) => `<a href="/blog/${escapeHtml(post.slug)}" style="display: flex; flex-direction: column; gap: 8px; padding: 20px 0; border-top: 1px solid #DCE3EC; text-decoration: none; color: inherit">
<h2 style="margin: 0; font-size: 22px; line-height: 1.3; color: #0A1466">${escapeHtml(post.title)}</h2>
<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #2B3850">${escapeHtml(post.description)}</p>
<p style="margin: 0; font-size: 14px; color: #5A6B80">Son güncelleme: <time datetime="${escapeHtml(post.updated)}">${dateLabel(post.updated)}</time></p>
</a>`)
    .join("\n");
  const main = `
<main id="ana-icerik" style="max-width: 820px; margin: 0 auto; padding: 32px 24px 72px; display: flex; flex-direction: column; gap: 18px">
<nav aria-label="Konum" style="font-size: 14px; color: #5A6B80">
<ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px">
<li><a href="/" style="color: #0013A3; text-decoration: none">Ana Sayfa</a></li><li aria-hidden="true">›</li>
<li aria-current="page" style="color: #3E4F63">Blog</li>
</ol>
</nav>
<h1 style="margin: 0; font-size: clamp(28px, 5vw, 40px); line-height: 1.15; letter-spacing: -0.02em; color: #0A1466">Blog</h1>
<p style="${P}">Endüstriyel su arıtma rehber yazıları.</p>
<div style="display: flex; flex-direction: column">${cards}</div>
</main>`;
  return sitePageHtml(main);
}

export function buildBlogPostHtml(post: BlogPost): string {
  const main = `
<main id="ana-icerik" style="max-width: 820px; margin: 0 auto; padding: 32px 24px 72px; display: flex; flex-direction: column; gap: 18px">
<nav aria-label="Konum" style="font-size: 14px; color: #5A6B80">
<ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px">
<li><a href="/" style="color: #0013A3; text-decoration: none">Ana Sayfa</a></li><li aria-hidden="true">›</li>
<li><a href="/blog" style="color: #0013A3; text-decoration: none">Blog</a></li><li aria-hidden="true">›</li>
<li aria-current="page" style="color: #3E4F63">${escapeHtml(post.title)}</li>
</ol>
</nav>
<h1 style="margin: 0; font-size: clamp(28px, 5vw, 40px); line-height: 1.15; letter-spacing: -0.02em; color: #0A1466">${escapeHtml(post.title)}</h1>
<p style="margin: 0; font-size: 14px; color: #5A6B80">Son güncelleme: <time datetime="${escapeHtml(post.updated)}">${dateLabel(post.updated)}</time></p>
<article style="display: flex; flex-direction: column; gap: 18px">
${bodyHtml(post.body)}
</article>
</main>
`;
  return sitePageHtml(main);
}
