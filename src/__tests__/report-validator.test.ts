import { describe, expect, test } from "@jest/globals";
import { validateReportDraft } from "../report-validator.js";

describe("validateReportDraft", () => {
  test("throws when the canonical subject wrapper is missing", () => {
    expect(() =>
      validateReportDraft(`────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

- Highlight

────────────────────────────────────────────────────────────
KEY WINS & METRICS

- Win

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

- Priority

Best regards,
BI Team`),
    ).toThrow("Missing canonical report subject wrapper.");
  });

  test("throws when text appears between the opening divider and project highlights", () => {
    expect(() =>
      validateReportDraft(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
Leadership summary

PROJECT HIGHLIGHTS

- Highlight

────────────────────────────────────────────────────────────
KEY WINS & METRICS

- Win

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

- Priority

Best regards,
BI Team`),
    ).toThrow('Expected section heading "PROJECT HIGHLIGHTS" in canonical order.');
  });

  test("throws when the canonical sections are missing", () => {
    expect(() =>
      validateReportDraft(
        "**Subject: BI Team Monthly Report – May 2026**\n\n────────────────────────────────────────────────────────────\n\nHi team",
      ),
    ).toThrow('Expected section heading "PROJECT HIGHLIGHTS" in canonical order.');
  });

  test("throws when the canonical sections are out of order", () => {
    expect(() =>
      validateReportDraft(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
KEY WINS & METRICS

- Win

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

- Highlight

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

- Priority

Best regards,
BI Team`),
    ).toThrow('Expected section heading "PROJECT HIGHLIGHTS" in canonical order.');
  });

  test("throws when a required section heading is not preceded by a divider", () => {
    expect(() =>
      validateReportDraft(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

- Highlight

KEY WINS & METRICS

- Win

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

- Priority

Best regards,
BI Team`),
    ).toThrow('Expected divider before section heading "KEY WINS & METRICS".');
  });
});
