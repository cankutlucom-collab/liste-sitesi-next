import { notFound } from "next/navigation";

/*
 * The /sehirler address is no longer used (answers 404). The category page no longer uses this template.
 * design.json is kept untouched, to be reused for the new directory page; this stub can be removed with a shell.
 */

export const dynamic = "force-dynamic";

export default function Page() {
  notFound();
}
