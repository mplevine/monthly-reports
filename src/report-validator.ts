const REQUIRED_HEADINGS = [
  "PROJECT HIGHLIGHTS",
  "KEY WINS & METRICS",
  "UPCOMING PRIORITIES",
  "Best regards,",
] as const;
const SECTION_DIVIDER = "─".repeat(60);
const SIGNATURE_LINE = "BI Team";
const SUBJECT_LINE_PATTERN = /^\*\*Subject: BI Team Monthly Report – [A-Za-z]+ \d{4}\*\*$/;
const SECTION_HEADINGS = REQUIRED_HEADINGS.slice(0, 3);

export function validateReportDraft(draft: string): void {
  const lines = draft
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!SUBJECT_LINE_PATTERN.test(lines[0] ?? "") || lines[1] !== SECTION_DIVIDER) {
    throw new Error("Missing canonical report subject wrapper.");
  }

  if (lines[2] !== REQUIRED_HEADINGS[0]) {
    throw new Error(
      `Expected section heading "${REQUIRED_HEADINGS[0]}" in canonical order.`,
    );
  }

  let cursor = 2;

  for (let headingIndex = 0; headingIndex < SECTION_HEADINGS.length; headingIndex += 1) {
    const heading = SECTION_HEADINGS[headingIndex];
    if (lines[cursor] !== heading) {
      throw new Error(`Expected section heading "${heading}" in canonical order.`);
    }

    cursor += 1;

    const contentStart = cursor;
    while (
      cursor < lines.length &&
      lines[cursor] !== SECTION_DIVIDER &&
      lines[cursor] !== REQUIRED_HEADINGS[3]
    ) {
      cursor += 1;
    }

    if (cursor === contentStart) {
      throw new Error(`Section "${heading}" must contain content.`);
    }

    const contentLines = lines.slice(contentStart, cursor);
    const misplacedNextHeading = headingIndex < SECTION_HEADINGS.length - 1
      ? contentLines.find((line) => line === SECTION_HEADINGS[headingIndex + 1])
      : undefined;
    if (misplacedNextHeading) {
      throw new Error(
        `Expected divider before section heading "${misplacedNextHeading}".`,
      );
    }

    if (heading === "PROJECT HIGHLIGHTS") {
      validateProjectHighlights(contentLines);
    } else {
      validateBulletSection(heading, contentLines);
    }

    if (headingIndex < SECTION_HEADINGS.length - 1) {
      if (lines[cursor] === SECTION_HEADINGS[headingIndex + 1]) {
        throw new Error(
          `Expected divider before section heading "${SECTION_HEADINGS[headingIndex + 1]}".`,
        );
      }

      if (lines[cursor] !== SECTION_DIVIDER) {
        throw new Error(
          `Unexpected content outside canonical sections: "${lines[cursor] ?? ""}".`,
        );
      }

      cursor += 1;
      if (lines[cursor] !== SECTION_HEADINGS[headingIndex + 1]) {
        throw new Error(
          `Expected section heading "${SECTION_HEADINGS[headingIndex + 1]}" in canonical order.`,
        );
      }
      continue;
    }

    if (lines[cursor] !== REQUIRED_HEADINGS[3]) {
      throw new Error(
        `Unexpected content outside canonical sections: "${lines[cursor + Number(lines[cursor] === SECTION_DIVIDER)] ?? lines[cursor] ?? ""}".`,
      );
    }
  }

  if (lines[cursor] !== REQUIRED_HEADINGS[3]) {
    throw new Error(`Missing required section heading "${REQUIRED_HEADINGS[3]}".`);
  }

  if (lines[cursor + 1] !== SIGNATURE_LINE) {
    throw new Error(`Missing required closing line "${SIGNATURE_LINE}".`);
  }

  if (cursor + 2 !== lines.length) {
    throw new Error(
      `Unexpected content outside canonical sections: "${lines[cursor + 2]}".`,
    );
  }
}

function isBulletLine(line: string | undefined): boolean {
  return Boolean(line && /^(?:[-*•])\s+/.test(line));
}

function isBoldHeading(line: string | undefined): boolean {
  return Boolean(line && /^\*\*.+\*\*$/.test(line));
}

function validateProjectHighlights(lines: string[]): void {
  if (lines.every(isBulletLine)) {
    return;
  }

  let cursor = 0;
  while (cursor < lines.length) {
    if (!isBoldHeading(lines[cursor])) {
      if (cursor === 0) {
        throw new Error('Section "PROJECT HIGHLIGHTS" must use canonical bullet structure.');
      }
      throw new Error(`Unexpected content outside canonical sections: "${lines[cursor]}".`);
    }

    cursor += 1;
    let bulletCount = 0;
    while (cursor < lines.length && isBulletLine(lines[cursor])) {
      bulletCount += 1;
      cursor += 1;
    }

    if (bulletCount === 0) {
      throw new Error('Section "PROJECT HIGHLIGHTS" must use canonical bullet structure.');
    }
  }
}

function validateBulletSection(heading: string, lines: string[]): void {
  const invalidIndex = lines.findIndex((line) => !isBulletLine(line));
  if (invalidIndex === -1) {
    return;
  }

  if (invalidIndex === 0) {
    throw new Error(`Section "${heading}" must use canonical bullet structure.`);
  }

  throw new Error(`Unexpected content outside canonical sections: "${lines[invalidIndex]}".`);
}
