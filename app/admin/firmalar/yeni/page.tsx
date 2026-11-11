import { requireAdmin } from "../../../../lib/auth";
import { listCategories } from "../../../../lib/category-store";
import { CATEGORY_SLUG } from "../../../../lib/cities";
import { listCities } from "../../../../lib/city-store";
import { validateFirm } from "../../../../lib/firms";
import FirmForm from "../../FirmForm";

export default async function NewFirmPage() {
  await requireAdmin();
  // Publish checklist for an empty form, from the same server-side validation used on save.
  const missing = Object.keys(validateFirm({}, "publish").errors);
  // The current category is preselected (what every new firm got before the picker existed); it can be unchecked.
  return (
    <FirmForm
      cities={listCities()}
      categories={listCategories()}
      firmCategories={[CATEGORY_SLUG]}
      missing={missing}
    />
  );
}
