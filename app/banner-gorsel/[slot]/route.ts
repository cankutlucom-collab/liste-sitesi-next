import { isAdmin } from "../../../lib/auth";
import { isBannerSlot, readBannerImage } from "../../../lib/banners";

/*
 * Serves a banner image from data/banners. Visitors get it only while the slot is enabled;
 * a signed-in admin can also preview a disabled one. The type comes from the file header, never from the name.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ slot: string }> }) {
  const { slot } = await ctx.params;
  if (!isBannerSlot(slot)) return new Response(null, { status: 404 });
  const image = readBannerImage(slot);
  if (!image || (!image.enabled && !(await isAdmin()))) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // The public URL carries ?v=<update time>, so a new upload is a new URL.
      "Cache-Control": image.enabled ? "public, max-age=86400" : "private, no-store",
    },
  });
}
