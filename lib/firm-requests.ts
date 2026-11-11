import { getDb } from "./db";
import { normalizeEmail, normalizeTrPhone } from "./firms";

/*
 * "Bu Profili Sahiplen" and "Firmayı Kaldır" requests sent from a published firm profile.
 *
 * Requests are stored for review only (admin › Formlar › Profil Talepleri). Nothing here assigns
 * ownership, edits, unpublishes or deletes a firm: any change is made by hand in the firm editor.
 */

export const REQUEST_TYPES = ["sahiplen", "kaldir"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export function isRequestType(value: unknown): value is RequestType {
  return typeof value === "string" && (REQUEST_TYPES as readonly string[]).includes(value);
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  sahiplen: "Sahiplenme talebi",
  kaldir: "Düzeltme / kaldırma bildirimi",
};

/** Profile button label → form page path segment. */
export function firmRequestPath(firm: { slug: string }, type: RequestType): string {
  return `/firmalar/${firm.slug}/${type}`;
}

/**
 * Report types for the Firmayı Kaldır form: the bullet headings of 05-Firma-Kaydi-Bildirimi.md,
 * except "Yetkisiz sahiplenme" (profiles cannot be claimed/owned yet, so it cannot happen).
 */
export const REPORT_TYPES = [
  "Yanlış veya eski bilgi",
  "Kişisel iletişim bilgisi",
  "Kapanan işletme veya mükerrer kayıt",
] as const;

export type FirmRequest = {
  id: number;
  firm_id: number;
  firm_name: string;
  request_type: RequestType;
  report_type: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  description: string;
  received_at: string;
  /** Current status of the firm row; null if the row no longer exists. */
  firm_status: "draft" | "published" | null;
  /** Current public address segment of the firm; null if the row no longer exists. */
  firm_slug: string | null;
};

export type RequestValues = {
  reportType: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  description: string;
};

/** Server-side validation of a submitted form. Returns null when anything is missing or malformed. */
export function validateRequest(type: RequestType, read: (key: string) => string): RequestValues | null {
  const name = read("ad");
  const role = type === "sahiplen" ? read("gorev") : "";
  const rawPhone = read("tel");
  const phone = rawPhone ? normalizeTrPhone(rawPhone) : "";
  const email = normalizeEmail(read("eposta"));
  const description = read("aciklama");
  const reportType = type === "kaldir" ? read("bildirim-turu") : "";

  if (!name || name.length > 120 || !email || email.length > 254 || phone === null) return null;
  if (type === "sahiplen") {
    // Claim: who is asking and how to reach them; the explanation is optional.
    if (!role || role.length > 120 || !phone || description.length > 2000) return null;
  } else {
    // Report: type and explanation required; phone optional (e-mail is the contact channel).
    if (!(REPORT_TYPES as readonly string[]).includes(reportType) || !description || description.length > 5000) return null;
  }
  return { reportType, name, role, phone, email, description };
}

export function saveRequest(firm: { id: number; name: string }, type: RequestType, values: RequestValues): void {
  getDb().prepare(
    `INSERT INTO firm_requests (firm_id, firm_name, request_type, report_type, name, role, phone, email, description, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    firm.id, firm.name, type, values.reportType, values.name, values.role, values.phone, values.email,
    values.description, new Date().toISOString(),
  );
}

export function listRequests(): FirmRequest[] {
  return getDb().prepare(
    "SELECT r.*, f.status AS firm_status, f.slug AS firm_slug FROM firm_requests r LEFT JOIN firms f ON f.id = r.firm_id ORDER BY r.id DESC",
  ).all() as FirmRequest[];
}
