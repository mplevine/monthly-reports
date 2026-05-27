const REQUIRED_HEADINGS = [
  "PROJECT HIGHLIGHTS",
  "KEY WINS & METRICS",
  "UPCOMING PRIORITIES",
  "Best regards,",
] as const;
const SECTION_DIVIDER = "─".repeat(60);
const SIGNATURE_LINE = "BI Team";

export function validateReportDraft(draft: string): void {
  const lines = draft
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let expectedHeadingIndex = 0;

  for (const [index, line] of lines.entries()) {
    if (!REQUIRED_HEADINGS.includes(line as (typeof REQUIRED_HEADINGS)[number])) {
      continue;
    }

    const expectedHeading = REQUIRED_HEADINGS[expectedHeadingIndex];
    if (line !== expectedHeading) {
      throw new Error(
        `Expected section heading "${expectedHeading}" in canonical order.`,
      );
    }

    if (expectedHeadingIndex < 3 && lines[index - 1] !== SECTION_DIVIDER) {
      throw new Error(`Expected divider before section heading "${line}".`);
    }

    expectedHeadingIndex += 1;
  }

  for (let index = expectedHeadingIndex; index < REQUIRED_HEADINGS.length; index += 1) {
    const heading = REQUIRED_HEADINGS[index];
    if (!lines.includes(heading)) {
      throw new Error(`Missing required section heading "${heading}".`);
    }

    throw new Error(`Expected section heading "${heading}" in canonical order.`);
  }

  if (lines[lines.length - 1] !== SIGNATURE_LINE) {
    throw new Error(`Missing required closing line "${SIGNATURE_LINE}".`);
  }
}
