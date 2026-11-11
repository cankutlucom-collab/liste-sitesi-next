import { requireAdmin } from "../../../lib/auth";
import { listApplications } from "../../../lib/applications";
import { createApplicationDraft } from "./actions";

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireAdmin();
  const applications = listApplications();
  const { durum } = await searchParams;
  return (
    <>
      <h1>Firma Başvuruları</h1>
      {durum === "taslak-olusturulamadi" && <p role="alert">Bu başvurudan firma taslağı oluşturulamadı.</p>}
      {applications.length === 0 && <p>Henüz firma başvurusu gönderilmedi.</p>}
      {applications.map((application) => (
        <details key={application.id} className="adm-card" style={{ marginBottom: 12, overflowWrap: "anywhere" }}>
          <summary>{application.firm} · {application.city} · {dateTime.format(new Date(application.received_at))}</summary>
          <p>Yetkili: {application.contact}</p>
          <p>Telefon: {application.phone}</p>
          <p>E-posta: {application.email}</p>
          <p>Adres: {application.address}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{application.description}</p>
          {application.firm_id ? (
            <a href={`/admin/firmalar/${application.firm_id}`}>Firma kaydını aç</a>
          ) : (
            <form action={createApplicationDraft}>
              <input type="hidden" name="applicationId" value={application.id} />
              <button type="submit" className="adm-btn">Başvurudan firma taslağı oluştur</button>
            </form>
          )}
        </details>
      ))}
    </>
  );
}
