import { requireAdmin } from "../../../lib/auth";
import { firmProfilePath } from "../../../lib/firms";
import { listRequests, REQUEST_TYPE_LABELS } from "../../../lib/firm-requests";

/*
 * "Bu Profili Sahiplen" / "Firmayı Kaldır" requests (read-only). There is deliberately no action
 * here: approving a claim or removing a firm is done by hand in the firm editor, never automatically.
 */

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

const FIRM_STATUS: Record<string, string> = { published: "yayında", draft: "taslak" };

export default async function FirmRequestsPage() {
  await requireAdmin();
  const requests = listRequests();
  return (
    <>
      <h1>Profil Talepleri</h1>
      <p>Sahiplenme talepleri ve düzeltme / kaldırma bildirimleri. Gönderilen talepler firma kaydını otomatik olarak değiştirmez.</p>
      {requests.length === 0 && <p>Henüz profil talebi gönderilmedi.</p>}
      {requests.map((request) => (
        <details key={request.id} className="adm-card" style={{ marginBottom: 12, overflowWrap: "anywhere" }}>
          <summary>
            {REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type} · {request.firm_name} (#{request.firm_id}) · {dateTime.format(new Date(request.received_at))}
          </summary>
          <p>
            Firma kaydı:{" "}
            {request.firm_status ? (
              <>
                <a href={`/admin/firmalar/${request.firm_id}`}>Panelde aç</a> ({FIRM_STATUS[request.firm_status] ?? request.firm_status})
                {request.firm_status === "published" && request.firm_slug && <> · <a href={firmProfilePath({ slug: request.firm_slug })} target="_blank" rel="noopener">Profili gör ↗</a></>}
              </>
            ) : "kayıt artık yok"}
          </p>
          {request.report_type && <p>Bildirim türü: {request.report_type}</p>}
          <p>Gönderen: {request.name}</p>
          {request.role && <p>Firmadaki görevi: {request.role}</p>}
          {request.phone && <p>Telefon: {request.phone}</p>}
          <p>E-posta: {request.email}</p>
          {request.description && <p style={{ whiteSpace: "pre-wrap" }}>{request.description}</p>}
        </details>
      ))}
    </>
  );
}
