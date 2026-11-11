import { requireAdmin } from "../../../lib/auth";
import { getDb } from "../../../lib/db";

type Complaint = {
  id: number;
  name: string;
  phone: string;
  email: string;
  firm: string;
  subject: string;
  incident_date: string;
  description: string;
  received_at: string;
};

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export default async function ComplaintsPage() {
  await requireAdmin();
  const complaints = getDb().prepare("SELECT * FROM complaints ORDER BY id DESC").all() as Complaint[];
  return (
    <>
      <h1>Şikâyetler</h1>
      {complaints.length === 0 && <p>Henüz şikâyet gönderilmedi.</p>}
      {complaints.map((complaint) => (
        <details key={complaint.id} className="adm-card" style={{ marginBottom: 12, overflowWrap: "anywhere" }}>
          <summary>{complaint.firm} · {complaint.subject} · {dateTime.format(new Date(complaint.received_at))}</summary>
          <p>Gönderen: {complaint.name}</p>
          <p>Telefon: {complaint.phone}</p>
          <p>E-posta: {complaint.email}</p>
          {complaint.incident_date && <p>Olay tarihi: {complaint.incident_date}</p>}
          <p style={{ whiteSpace: "pre-wrap" }}>{complaint.description}</p>
        </details>
      ))}
    </>
  );
}
