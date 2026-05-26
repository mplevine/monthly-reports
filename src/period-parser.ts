/**
 * Utilities for parsing the user's Copilot chat message to determine the
 * report period (month and year).
 */

import { ReportPeriod } from "./types.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Abbreviated month names accepted in user messages. */
const MONTH_ALIASES: Record<string, number> = {
  // 3-letter abbreviations
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5, // "may" is both the abbreviation and the full name for month 5
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  // Full month names (excluding "may" which is already covered above)
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/**
 * Parses a month and year from a natural-language string such as:
 *   - "generate report for May 2025"
 *   - "May 2025 report"
 *   - "2025-05"
 *   - "05/2025"
 *
 * Falls back to the previous calendar month when no date information is found.
 *
 * @param text - The raw user message.
 * @returns A `ReportPeriod` with `monthName`, `month` (1–12), and `year`.
 */
export function parseReportPeriod(text: string): ReportPeriod {
  const lower = text.toLowerCase();

  // Try "Month YYYY" or "YYYY Month"
  for (const [alias, monthNum] of Object.entries(MONTH_ALIASES)) {
    const patterns = [
      new RegExp(`\\b${alias}\\s+(\\d{4})\\b`, "i"),
      new RegExp(`\\b(\\d{4})\\s+${alias}\\b`, "i"),
    ];
    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        if (year >= 2000 && year <= 2100) {
          return buildPeriod(monthNum, year);
        }
      }
    }
  }

  // Try ISO format YYYY-MM or MM/YYYY or MM-YYYY
  const isoMatch = lower.match(/\b(\d{4})-(\d{2})\b/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (month >= 1 && month <= 12) {
      return buildPeriod(month, year);
    }
  }

  const slashMatch = lower.match(/\b(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const year = parseInt(slashMatch[2], 10);
    if (month >= 1 && month <= 12) {
      return buildPeriod(month, year);
    }
  }

  // Default: previous calendar month
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return buildPeriod(prev.getMonth() + 1, prev.getFullYear());
}

function buildPeriod(month: number, year: number): ReportPeriod {
  return { month, year, monthName: MONTH_NAMES[month - 1] };
}
