/**
 * Copilot Extension agent request handler.
 *
 * Processes incoming requests from GitHub Copilot Chat, fetches the relevant
 * OneNote meeting notes, and streams back the generated leadership email.
 */

import {
  createAckEvent,
  createDoneEvent,
  createErrorsEvent,
  createTextEvent,
  getUserMessage,
  parseRequestBody,
} from "@copilot-extensions/preview-sdk";
import { Request, Response } from "express";
import { fetchOneNotePages, loadOneNoteConfig } from "./onenote.js";
import { parseReportPeriod } from "./period-parser.js";
import { generateReport } from "./report-generator.js";

/**
 * POST /agent — entry point for all GitHub Copilot Extension requests.
 *
 * The handler:
 * 1. Acknowledges the request immediately.
 * 2. Parses the user's message to determine the report period.
 * 3. Fetches meeting-note pages from OneNote.
 * 4. Generates and streams back the leadership email.
 */
export async function agentHandler(req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.write(createAckEvent());

  const token = extractToken(req);
  if (!token) {
    res.write(
      createErrorsEvent([
        {
          type: "agent",
          code: "missing_token",
          message:
            "No GitHub Copilot token found in the Authorization header. " +
            "Make sure you are invoking this extension from within GitHub Copilot Chat.",
          identifier: "missing_token",
        },
      ]),
    );
    res.end(createDoneEvent());
    return;
  }

  try {
    const payload = parseRequestBody(req.body as string);
    const userMessage = getUserMessage(payload) ?? "";
    const period = parseReportPeriod(userMessage);

    res.write(
      createTextEvent(
        `📅 Fetching BI Team meeting notes for **${period.monthName} ${period.year}**…\n\n`,
      ),
    );

    const config = loadOneNoteConfig();
    const pages = await fetchOneNotePages(config, period);

    if (pages.length === 0) {
      res.write(
        createTextEvent(
          `⚠️ No meeting notes found in **${config.notebookName} › ${config.sectionName}** ` +
            `for ${period.monthName} ${period.year}.\n\n` +
            `Please check that:\n` +
            `- The correct notebook and section names are configured.\n` +
            `- Pages were created during ${period.monthName} ${period.year}.\n`,
        ),
      );
      res.end(createDoneEvent());
      return;
    }

    res.write(
      createTextEvent(
        `✅ Found **${pages.length}** note${pages.length === 1 ? "" : "s"}. Generating report…\n\n`,
      ),
    );

    const email = await generateReport(pages, period, token);
    res.write(createTextEvent(email));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.write(
      createErrorsEvent([
        {
          type: "agent",
          code: "report_generation_error",
          message: `Failed to generate the monthly report: ${message}`,
          identifier: "report_generation_error",
        },
      ]),
    );
  }

  res.end(createDoneEvent());
}

/**
 * Extracts the bearer token from the Authorization header.
 */
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const parts = auth.split(" ");
  return parts.length === 2 && parts[0].toLowerCase() === "bearer"
    ? parts[1]
    : null;
}
