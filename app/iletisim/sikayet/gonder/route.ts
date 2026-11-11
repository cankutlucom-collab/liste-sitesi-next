import { getDb } from "../../../../lib/db";
import { normalizeEmail, normalizeTrPhone } from "../../../../lib/firms";

const SUBJECTS = new Set([
  "Hizmet kalitesi",
  "Teklif veya fiyata uyulmaması",
  "Firmaya ulaşılamaması",
  "Profildeki bilgilerin yanlış olması",
  "Diğer",
]);

export async function POST(request: Request) {
  const result = (status: string) => new Response(null, {
    status: 303,
    headers: { Location: `/iletisim/sikayet?sonuc=${status}` },
  });
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded") ||
      Number(request.headers.get("content-length")) > 100_000) {
    return result("gecersiz");
  }

  const body = await request.text();
  if (body.length > 100_000) return result("gecersiz");
  const form = new URLSearchParams(body);
  const read = (key: string) => form.get(key)?.trim() ?? "";
  const name = read("ad");
  const firm = read("firma");
  const subject = read("konu");
  const date = read("tarih");
  const description = read("aciklama");
  const phone = normalizeTrPhone(read("tel"));
  const email = normalizeEmail(read("eposta"));
  const parsedDate = new Date(date);
  const validDate = !date || (/^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date);
  if (!name || name.length > 120 || !firm || firm.length > 180 ||
      !SUBJECTS.has(subject) || !validDate || !description || description.length > 5000 ||
      !phone || !email || email.length > 254) return result("gecersiz");

  try {
    getDb().prepare(
      "INSERT INTO complaints (name, phone, email, firm, subject, incident_date, description, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(name, phone, email, firm, subject, date, description, new Date().toISOString());
  } catch {
    console.error("Could not save complaint.");
    return result("hata");
  }
  return result("alindi");
}
