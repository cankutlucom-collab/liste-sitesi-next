import { RequestPage, requestMetadata, type Params, type SearchParams } from "../request-page";

// "Firmayı Kaldır" form. Always read the current row: an unpublished firm answers 404.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: Params }) {
  return requestMetadata(params, "kaldir");
}

export default function RemovalPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return RequestPage({ params, searchParams, type: "kaldir" });
}
