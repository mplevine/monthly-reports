import { describe, expect, test } from "@jest/globals";
import { formatEmail } from "../email-template.js";

describe("formatEmail", () => {
  test("wraps a generated body with the canonical subject line", () => {
    const result = formatEmail(
      "PROJECT HIGHLIGHTS\n\nKEY WINS & METRICS\n\nUPCOMING PRIORITIES\n\nBest regards,\nBI Team",
      {
        year: 2026,
        month: 5,
        monthName: "May",
      },
    );

    expect(result).toContain("**Subject: BI Team Monthly Report – May 2026**");
  });
});
