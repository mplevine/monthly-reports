/**
 * Email template and formatting utilities for the BI Team monthly leadership report.
 *
 * The established format consists of:
 *   - A subject line
 *   - An introductory paragraph
 *   - Project highlights section
 *   - Key wins & metrics section
 *   - Upcoming priorities section
 *   - A professional closing
 */

import { ReportPeriod } from "./types.js";

const SECTION_DIVIDER = "─".repeat(60);

/**
 * Wraps an AI-generated email body with the standard subject line and dividers.
 *
 * @param body - The raw email body produced by the AI summarizer.
 * @param period - The report period (month name + year).
 * @returns The fully formatted leadership email as a Markdown string.
 */
export function formatEmail(body: string, period: ReportPeriod): string {
  const { monthName, year } = period;

  const subject = `**Subject: BI Team Monthly Report – ${monthName} ${year}**`;

  return [subject, "", SECTION_DIVIDER, "", body.trim(), ""].join("\n");
}

/**
 * Builds the system prompt that instructs the LLM how to structure the email.
 *
 * @param period - The report period used for context in the prompt.
 * @returns A system-role prompt string.
 */
export function buildSystemPrompt(period: ReportPeriod): string {
  const { monthName, year } = period;

  return `\
You are an assistant that creates concise, professional monthly update emails for senior leadership on behalf of the BI (Business Intelligence) Team.

Given a set of meeting notes from the BI Team's ${monthName} ${year} meetings, produce the body of a leadership email that follows this exact format:

---

Hi [Leadership Team],

Below is the BI Team's monthly update for ${monthName} ${year}.

${SECTION_DIVIDER}
PROJECT HIGHLIGHTS

[For each active project, write a short paragraph or bullet list summarising progress, decisions made, and any blockers. Group all updates under the project name as a bold heading.]

${SECTION_DIVIDER}
KEY WINS & METRICS

[Bullet list of the most impactful accomplishments or metrics from the month.]

${SECTION_DIVIDER}
UPCOMING PRIORITIES

[Bullet list of the top priorities for the next month.]

${SECTION_DIVIDER}

Please feel free to reach out with any questions.

Best regards,
BI Team

---

Rules:
- Write only the email body — no preamble, no meta-commentary.
- Use plain language suitable for a non-technical executive audience.
- Be concise: aim for 300–500 words total.
- Keep project sections focused on outcomes and impact, not technical details.
- If a section has no relevant information in the notes, omit it gracefully.
- Preserve the section divider lines (─ characters) exactly as shown above.
`;
}

/**
 * Builds the user-facing prompt that passes the meeting notes to the LLM.
 *
 * @param notes - Combined raw meeting notes content.
 * @param period - The report period.
 * @returns A user-role prompt string.
 */
export function buildUserPrompt(notes: string, period: ReportPeriod): string {
  const { monthName, year } = period;

  return `\
Here are the BI Team's meeting notes for ${monthName} ${year}. Please generate the leadership email:

${notes}
`;
}
