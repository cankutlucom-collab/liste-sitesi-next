import { PolicyPage, policyMetadata } from "../policy-page";

export const metadata = policyMetadata("cookies");

export default function Page() {
  return <PolicyPage policy="cookies" />;
}
