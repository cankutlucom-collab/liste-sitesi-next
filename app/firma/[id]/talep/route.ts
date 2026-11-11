import { getPublishedFirmByParam } from "../../../../lib/firms";

/*
 * Retired POST address /firma/<number>/talep (forms rendered before the address change). 308 keeps the
 * method and body, so the browser re-sends the same form to /firmalar/<firma-adi>/talep.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const firm = getPublishedFirmByParam((await params).id);
  if (!firm) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 308, headers: { Location: `/firmalar/${firm.slug}/talep` } });
}
