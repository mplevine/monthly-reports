import { afterAll, beforeAll, describe, expect, jest, test } from "@jest/globals";
import { parseReportPeriod } from "../period-parser.js";

describe("parseReportPeriod", () => {
  const FIXED_NOW = new Date(2025, 4, 15); // 15 May 2025

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("parses full month name + year", () => {
    const result = parseReportPeriod("generate report for January 2025");
    expect(result).toEqual({ month: 1, year: 2025, monthName: "January" });
  });

  test("parses abbreviated month + year", () => {
    const result = parseReportPeriod("bi report feb 2024");
    expect(result).toEqual({ month: 2, year: 2024, monthName: "February" });
  });

  test("parses year-then-month format", () => {
    const result = parseReportPeriod("2025 march summary");
    expect(result).toEqual({ month: 3, year: 2025, monthName: "March" });
  });

  test("parses ISO YYYY-MM format", () => {
    const result = parseReportPeriod("report for 2025-06");
    expect(result).toEqual({ month: 6, year: 2025, monthName: "June" });
  });

  test("parses MM/YYYY format", () => {
    const result = parseReportPeriod("monthly report 04/2025");
    expect(result).toEqual({ month: 4, year: 2025, monthName: "April" });
  });

  test("defaults to previous month when no date info present", () => {
    // Fixed to May 2025, so previous month is April 2025
    const result = parseReportPeriod("generate the monthly report");
    expect(result).toEqual({ month: 4, year: 2025, monthName: "April" });
  });

  test("handles case-insensitive month names", () => {
    const result = parseReportPeriod("DECEMBER 2024");
    expect(result).toEqual({ month: 12, year: 2024, monthName: "December" });
  });

  test("handles October abbreviated as 'oct'", () => {
    const result = parseReportPeriod("oct 2023");
    expect(result).toEqual({ month: 10, year: 2023, monthName: "October" });
  });

  test("rejects out-of-range years and falls back to previous month", () => {
    const result = parseReportPeriod("report for january 1999");
    // 1999 is outside 2000–2100, so falls back to April 2025
    expect(result).toEqual({ month: 4, year: 2025, monthName: "April" });
  });
});
