import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { join } from "node:path";

const source = process.argv[2];
const files = readdirSync(source);
const pages = [
  ["03", "04", "sehirler", "Şehirler", "Endüstriyel su arıtma firmalarını il adına göre keşfedin."],
  ["05", "06", "firma-profili", "Firma Profili", "Endüstriyel su arıtma firması için örnek profil ve hizmet bilgileri."],
  ["07", "08", "blog", "Blog", "Endüstriyel su arıtma hakkında rehber yazısı."],
  ["09", "10", "iletisim", "İletişim", "Endüstriyel Su Arıtma rehberiyle iletişim seçenekleri."],
  ["11", "12", "iletisim/sikayet", "Şikâyet Formu", "Şikâyet formunun önizlemesi."],
];

function readDesign(number, prefix) {
  const file = files.find((name) => name.startsWith(number + "-"));
  assert.ok(file, number);
  const html = readFileSync(join(source, file), "utf8");
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  assert.ok(body, file);
  return body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\b(id|for|aria-controls)="([^"]+)"/g, (_, key, value) => key + '="' + prefix + value + '"')
    .replace(/href="#([^"]+)"/g, 'href="#' + prefix + '$1"')
    .replace(/href="\/firmalar\/?"/g, 'href="/sehirler"')
    .replace(/href="\/(?:iletisim|blog)\/"/g, (link) => link.replace(/\/"$/, '"'))
    .replace(/href="\/firmalar\/[^"]+"/g, 'href="#" data-demo-link="true"');
}

const homePath = "app/home.json";
const home = JSON.parse(readFileSync(homePath, "utf8").replace(/^\uFEFF/, ""));
writeFileSync(homePath, JSON.stringify(home.replace(/href="#sehir-baslik"([^>]*>Şehirler)/g, 'href="/sehirler"$1')));

for (const [desktop, mobile, route, title, description] of pages) {
  const directory = join("app", route);
  const views = [readDesign(desktop, "d-"), readDesign(mobile, "m-")];
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "design.json"), JSON.stringify(views));
  writeFileSync(join(directory, "page.tsx"), `import type { Metadata } from "next";
import Script from "next/script";
import views from "./design.json";

export const metadata: Metadata = ${JSON.stringify({ title: title + " | Endüstriyel Su Arıtma", description })};

export default function Page() {
  return <>
    <link rel="stylesheet" href="/design.css" />
    <nav className="project-nav" aria-label="Site sayfaları">
      <a href="/">Ana Sayfa</a><a href="/sehirler">Şehirler</a>
      <a href="/firma-profili">Örnek Firma</a><a href="/blog">Blog</a>
      <a href="/iletisim">İletişim</a><a href="/iletisim/sikayet">Şikâyet</a>
    </nav>
    <p className="demo-note">Tasarım önizlemesi. Firma ve iletişim bilgileri örnektir.</p>
    <div className="desktop-design" dangerouslySetInnerHTML={{ __html: views[0] }} />
    <div className="mobile-design" dangerouslySetInnerHTML={{ __html: views[1] }} />
    <Script src="/design.js" strategy="afterInteractive" />
  </>;
}
`);
  const dist = ".verification-" + desktop + "-" + Date.now();
  execSync("npm.cmd run build", { stdio: "inherit", env: { ...process.env, LISTE_BUILD_DIR: dist } });
  const html = readFileSync(join(dist, "server/app", route + ".html"), "utf8");
  assert.ok(html.includes("<title>" + title + " | Endüstriyel Su Arıtma</title>"));
  assert.ok(html.includes('class="desktop-design"') && html.includes('class="mobile-design"'));
  assert.ok(html.includes('name="description"'));
  console.log("Verified rendered route /" + route);
}

