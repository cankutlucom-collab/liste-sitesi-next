import { revalidatePath } from "next/cache";
import { isAdmin } from "../../../../lib/auth";
import { BANNER_LIMITS, isBannerSlot, removeBanner, saveBanner, type BannerResult } from "../../../../lib/banners";

/*
 * Banner panel form target (/admin/bannerlar). A Route Handler instead of a Server Action because the form
 * carries an image: the body is read here with a hard size cap. Needs the admin session; answers with a
 * redirect back to the panel (?durum=… or ?hata=…).
 */

const BASE = "/admin/bannerlar";
const MAX_BODY = BANNER_LIMITS.bytes + 64 * 1024; // image + form fields / multipart overhead

const back = (query: string) => new Response(null, { status: 303, headers: { Location: `${BASE}?${query}` } });

/** Reads the request body, giving up as soon as it exceeds the cap. */
async function readCapped(request: Request): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response(null, { status: 303, headers: { Location: "/admin" } });

  // Same-origin form posts only (the session cookie is also SameSite=Strict).
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let originHost: string | null = null;
  try { originHost = origin ? new URL(origin).host : null; } catch { /* "null" or malformed origin */ }
  if ((site && site !== "same-origin") || (origin && (!originHost || (host && originHost !== host)))) {
    return new Response(null, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return back("hata=istek");

  const body = await readCapped(request);
  if (!body) return back("hata=dosya-buyuk");

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(body), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return back("hata=istek");
  }

  const slot = String(form.get("slot") ?? "");
  if (!isBannerSlot(slot)) return back("hata=slot");

  let result: BannerResult;
  let ok: string;
  if (form.get("islem") === "kaldir") {
    result = removeBanner(slot);
    ok = "kaldirildi";
  } else {
    const file = form.get("gorsel");
    let upload: Buffer | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > BANNER_LIMITS.bytes) return back(`hata=dosya-buyuk&slot=${slot}`);
      upload = Buffer.from(await file.arrayBuffer());
    }
    result = saveBanner(slot, {
      alt: form.get("alt"),
      link: form.get("baglanti"),
      enabled: form.get("yayinda") === "1",
      upload,
    });
    ok = "kaydedildi";
  }

  if (!result.ok) return back(`hata=${result.code}&slot=${slot}`);
  revalidatePath("/", "layout");
  return back(`durum=${ok}&slot=${slot}`);
}
