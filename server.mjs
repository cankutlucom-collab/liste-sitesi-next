// cPanel "Setup Node.js App" baslangic dosyasi (Application startup file).
// Production modunda Next.js'i process.env.PORT uzerinde calistirir.
// Gereksinim: Node 22 (data/liste.sqlite icin node:sqlite). data/ klasoru repoda yok;
// sunucudaki diskte kalir.
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import next from "next";

process.env.NODE_ENV = "production";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const dir = fileURLToPath(new URL(".", import.meta.url));

const app = next({ dev: false, dir, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error("Istek hatasi:", error);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Internal Server Error");
  });
}).listen(port, () => {
  console.log(`> Next.js production, port ${port}`);
});
