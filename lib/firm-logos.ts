import logos from "./firm-logos.json";

const officialLogos: Record<string, { name: string; file: string }> = logos;

export function firmLogoPath(firm: { id: number; name: string }): string | undefined {
  const logo = officialLogos[String(firm.id)];
  if (logo?.name === firm.name) return "/firma-logolari/" + logo.file;
}
