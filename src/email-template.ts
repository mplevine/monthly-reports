import { ReportPeriod } from "./types.js";

const SECTION_DIVIDER = "─".repeat(60);

export function formatEmail(body: string, period: ReportPeriod): string {
  const subject = `**Subject: BI Team Monthly Report – ${period.monthName} ${period.year}**`;
  return [subject, "", body.trim(), ""].join("\n");
}
