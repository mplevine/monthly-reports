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

  test("throws when a required section is empty", () => {
    expect(() =>
      validateReportDraft(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

────────────────────────────────────────────────────────────
KEY WINS & METRICS

- Win

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

- Priority

Best regards,
BI Team`),
    ).toThrow('Section "PROJECT HIGHLIGHTS" must contain content.');
  });

  test("throws when unexpected trailing content appears after upcoming priorities", () => {
    expect(() =>
      validateReportDraft(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

- Highlight

────────────────────────────────────────────────────────────
KEY WINS & METRICS

- Win

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

- Priority

Additional Notes

Best regards,
BI Team`),
    ).toThrow('Unexpected content outside canonical sections: "Additional Notes".');
  });

  test("throws when a section uses prose instead of canonical bullet structure", () => {
    expect(() =>
      validateReportDraft(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

This month focused on steady delivery across analytics initiatives.

────────────────────────────────────────────────────────────
KEY WINS & METRICS

• Win

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

• Priority

Best regards,
BI Team`),
    ).toThrow('Section "PROJECT HIGHLIGHTS" must use canonical bullet structure.');
  });

  test("accepts the documented canonical report shape", () => {
    expect(() =>
      validateReportDraft(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

**Modernization Program**
• Completed the dashboard migration wave.
• Reduced manual QA time by 25%.

────────────────────────────────────────────────────────────
KEY WINS & METRICS

• Dashboard adoption reached 92%.

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

• Finalize the June enablement plan.

Best regards,
BI Team`),
    ).not.toThrow();
  });
});
