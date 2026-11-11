import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="tr"><body id="ust">{children}</body></html>;
}
