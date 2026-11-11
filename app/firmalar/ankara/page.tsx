import type { Metadata } from "next";
import FirmProfilePage, { generateMetadata as firmMetadata } from "../[city]/page";

/*
 * /firmalar/ankara is a static folder that would shadow /firmalar/[city]. It is therefore the normal
 * firm profile with the slug fixed to "ankara": it shows a firm only if a published firm really has
 * that address, otherwise it answers 404 exactly as before. Can be deleted with the folder.
 */

export const dynamic = "force-dynamic";

const params = Promise.resolve({ city: "ankara" });

export function generateMetadata(): Promise<Metadata> {
  return firmMetadata({ params });
}

export default function Page() {
  return FirmProfilePage({ params });
}
