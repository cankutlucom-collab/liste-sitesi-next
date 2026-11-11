import { isSupportedCity } from "../../../lib/city-store";
import { getDb } from "../../../lib/db";
import { normalizeEmail, normalizeTrPhone } from "../../../lib/firms";

export async function POST(request: Request) {
  const result = (status: string) => new Response(null, {
    status: 303,
    headers: { Location: `/iletisim?basvuru=${status}` },
  });
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded") ||
      Number(request.headers.get("content-length")) > 100_000) return result("gecersiz");

  const body = await request.text();
  if (body.length > 100_000) return result("gecersiz");
  const form = new URLSearchParams(body);
  const read = (key: string) => form.get(key)?.trim() ?? "";
  const firm = read("firma-adi");
  const city = read("merkez-il");
  const contact = read("yetkili");
  const phone = normalizeTrPhone(read("b-tel"));
  const email = normalizeEmail(read("b-eposta"));
  const address = read("adres");
  const description = read("tanitim");
  if (firm.length < 2 || firm.length > 180 || !isSupportedCity(city) ||
      !contact || contact.length > 120 || !phone || !email || email.length > 254 ||
      !address || address.length > 500 || !description || description.length > 5000) return result("gecersiz");

  try {
    getDb().prepare(
      "INSERT INTO firm_applications (firm, city, contact, phone, email, address, description, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(firm, city, contact, phone, email, address, description, new Date().toISOString());
  } catch {
    console.error("Could not save firm application.");
    return result("hata");
  }
  return result("alindi");
}
