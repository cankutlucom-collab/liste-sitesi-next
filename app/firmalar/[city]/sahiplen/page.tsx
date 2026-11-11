import { RequestPage, requestMetadata, type Params, type SearchParams } from "../request-page";

// "Bu Profili Sahiplen" form. Always read the current row: an unpublished firm answers 404.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: Params }) {
  return requestMetadata(params, "sahiplen");
}

export default function ClaimPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return RequestPage({ params, searchParams, type: "sahiplen" });
}
