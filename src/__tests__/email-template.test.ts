import { describe, expect, test } from "@jest/globals";
import {
  buildSystemPrompt,
  buildUserPrompt,
  formatEmail,
} from "../email-template.js";
import { ReportPeriod } from "../types.js";

const MAY_2025: ReportPeriod = { month: 5, year: 2025, monthName: "May" };

describe("formatEmail", () => {
  test("includes a correctly formatted subject line", () => {
    const result = formatEmail("Email body here.", MAY_2025);
    expect(result).toContain(
      "**Subject: BI Team Monthly Report – May 2025**",
    );
  });

  test("includes the email body", () => {
    const body = "Hello leadership team, here is the update.";
    const result = formatEmail(body, MAY_2025);
    expect(result).toContain(body);
  });

  test("includes a section divider", () => {
    const result = formatEmail("body", MAY_2025);
    expect(result).toContain("─".repeat(60));
  });

  test("trims leading/trailing whitespace from the body", () => {
    const result = formatEmail("   body with spaces   ", MAY_2025);
    expect(result).toContain("body with spaces");
    expect(result).not.toContain("   body with spaces   ");
  });
});

describe("buildSystemPrompt", () => {
  test("includes the month and year in the system prompt", () => {
    const result = buildSystemPrompt(MAY_2025);
    expect(result).toContain("May 2025");
  });

  test("instructs the model to write only the email body", () => {
    const result = buildSystemPrompt(MAY_2025);
    expect(result).toContain("Write only the email body");
  });

  test("instructs the model to target a non-technical executive audience", () => {
    const result = buildSystemPrompt(MAY_2025);
    expect(result).toContain("executive audience");
  });

  test("includes all required section headings", () => {
    const result = buildSystemPrompt(MAY_2025);
    expect(result).toContain("PROJECT HIGHLIGHTS");
    expect(result).toContain("KEY WINS & METRICS");
    expect(result).toContain("UPCOMING PRIORITIES");
  });
});

describe("buildUserPrompt", () => {
  test("includes the month and year", () => {
    const result = buildUserPrompt("some notes", MAY_2025);
    expect(result).toContain("May 2025");
  });

  test("includes the provided meeting notes", () => {
    const notes = "Meeting recap: discussed dashboard improvements.";
    const result = buildUserPrompt(notes, MAY_2025);
    expect(result).toContain(notes);
  });
});
