import { getDb } from "./db";
import { createFirm, validateFirm } from "./firms";

type Application = {
  id: number;
  firm: string;
  city: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  received_at: string;
  firm_id: number | null;
};

export function listApplications() {
  return getDb().prepare(
    "SELECT a.*, af.firm_id FROM firm_applications a LEFT JOIN application_firms af ON af.application_id = a.id ORDER BY a.id DESC",
  ).all() as Application[];
}

export function createDraftFromApplication(id: number): number | null {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const application = db.prepare(
      "SELECT a.*, af.firm_id FROM firm_applications a LEFT JOIN application_firms af ON af.application_id = a.id WHERE a.id = ?",
    ).get(id) as Application | undefined;
    let firmId = application?.firm_id ?? null;
    if (application && firmId === null) {
      const draft = validateFirm({
        name: application.firm.slice(0, 120),
        city: application.city,
        phone: application.phone,
        email: application.email,
        address: application.address.slice(0, 300),
        shortDescription: application.description.slice(0, 300),
      }, "draft");
      if (draft.valid) {
        firmId = createFirm(draft.values, "draft");
        db.prepare("INSERT INTO application_firms (application_id, firm_id) VALUES (?, ?)").run(id, firmId);
      }
    }
    db.exec("COMMIT");
    return firmId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
