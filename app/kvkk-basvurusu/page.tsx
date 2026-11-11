import { PolicyPage, policyMetadata } from "../policy-page";

export const metadata = policyMetadata("kvkkApplication");

export default function Page() {
  return <PolicyPage policy="kvkkApplication" />;
}
