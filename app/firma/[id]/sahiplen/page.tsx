import { notFound, permanentRedirect } from "next/navigation";
import { firmRequestPath } from "../../../../lib/firm-requests";
import { getPublishedFirmByParam } from "../../../../lib/firms";

// Retired address /firma/<number>/sahiplen: permanent redirect to /firmalar/<firma-adi>/sahiplen.
export const dynamic = "force-dynamic";

export default async function OldClaimAddress({ params }: { params: Promise<{ id: string }> }) {
  const firm = getPublishedFirmByParam((await params).id);
  if (!firm) notFound();
  permanentRedirect(firmRequestPath(firm, "sahiplen"));
}
