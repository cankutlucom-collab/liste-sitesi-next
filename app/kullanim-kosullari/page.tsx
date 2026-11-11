import { PolicyPage, policyMetadata } from "../policy-page";

export const metadata = policyMetadata("terms");

export default function Page() {
  return <PolicyPage policy="terms" />;
}
