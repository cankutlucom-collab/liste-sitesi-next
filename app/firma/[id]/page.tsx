import { notFound, permanentRedirect } from "next/navigation";
import { firmProfilePath, getPublishedFirmByParam } from "../../../lib/firms";

/*
 * Retired address /firma/<number>: permanently (308) redirects to /firmalar/<firma-adi>.
 * Same visibility rule as before: only a canonical number of a published firm redirects; drafts,
 * unknown numbers and non-canonical ones ("012", "1abc") answer 404.
 */

export const dynamic = "force-dynamic";

export default async function OldFirmAddress({ params }: { params: Promise<{ id: string }> }) {
  const firm = getPublishedFirmByParam((await params).id);
  if (!firm) notFound();
  permanentRedirect(firmProfilePath(firm));
}
