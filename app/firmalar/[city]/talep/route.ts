import { getPublishedFirmBySlug } from "../../../../lib/firms";
import { firmRequestPath, isRequestType, saveRequest, validateRequest } from "../../../../lib/firm-requests";

/*
 * POST target of the "Bu Profili Sahiplen" and "Firmayı Kaldır" forms. The firm comes from the URL
 * slug (/firmalar/<firma-adi>/talep), the request type from the hidden "talep" field (allow-list).
 * Only published firms accept requests. The request is stored for the admin; the firm row is never changed here.
 */
export async function POST(request: Request, { params }: { params: Promise<{ city: string }> }) {
  const firm = getPublishedFirmBySlug((await params).city);
  if (!firm) return new Response("Not found", { status: 404 });

  const bad = () => new Response(null, { status: 303, headers: { Location: firmRequestPath(firm, "kaldir") + "?sonuc=gecersiz" } });
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded") ||
      Number(request.headers.get("content-length")) > 100_000) return bad();

  const body = await request.text();
  if (body.length > 100_000) return bad();
  const form = new URLSearchParams(body);
  const type = form.get("talep");
  if (!isRequestType(type)) return bad();

  const result = (status: string) => new Response(null, {
    status: 303,
    headers: { Location: `${firmRequestPath(firm, type)}?sonuc=${status}` },
  });
  const values = validateRequest(type, (key) => form.get(key)?.trim() ?? "");
  if (!values) return result("gecersiz");

  try {
    saveRequest(firm, type, values);
  } catch {
    console.error("Could not save firm request.");
    return result("hata");
  }
  return result("alindi");
}
