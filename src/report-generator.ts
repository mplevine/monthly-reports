/**
 * Report generator that uses the GitHub Copilot LLM (via the Extensions SDK)
 * to summarise meeting notes into a formatted leadership email.
 */

import { prompt } from "@copilot-extensions/preview-sdk";
import { buildSystemPrompt, buildUserPrompt, formatEmail } from "./email-template.js";
import { OneNotePage, ReportPeriod } from "./types.js";

/**
 * Combines an array of OneNote pages into a single plain-text document
 * suitable for passing to the LLM.
 */
export function combineNotes(pages: OneNotePage[]): string {
  return pages
    .map((page) => `## ${page.title}\n\n${page.content}`)
    .join("\n\n---\n\n");
}

/**
 * Generates the full leadership email by:
 *  1. Combining meeting notes from all pages.
 *  2. Calling the Copilot LLM to summarise them.
 *  3. Wrapping the result in the established email format.
 *
 * @param pages  - Meeting-note pages fetched from OneNote.
 * @param period - The report period (month + year).
 * @param token  - The GitHub Copilot token from the incoming request.
 * @returns The formatted leadership email as a Markdown string.
 */
export async function generateReport(
  pages: OneNotePage[],
  period: ReportPeriod,
  token: string,
): Promise<string> {
  const notes = combineNotes(pages);
  const systemPrompt = buildSystemPrompt(period);
  const userContent = buildUserPrompt(notes, period);

  const { message } = await prompt({
    token,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return formatEmail(message.content, period);
}
