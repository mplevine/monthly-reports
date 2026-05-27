import { describe, expect, jest, test } from "@jest/globals";
import { runReportCommand } from "../commands/run-report.js";

describe("runReportCommand", () => {
  test("writes a report draft, source bundle, and audit trail to a timestamped directory", async () => {
    const deps = {
      loadAppConfig: jest.fn(async () => ({
        onenote: {
          tenantId: "tenant-id",
          clientId: "client-id",
          userId: "bi-team@yourorg.onmicrosoft.com",
          notebookName: "BI Team Notebook",
          sectionName: "Meeting Notes",
        },
        generation: {
          provider: "github_models",
          model: "openai/gpt-4.1",
          temperature: 0.2,
          maxTokens: 1200,
        },
        output: { rootDirectory: "reports/generated" },
        secrets: { githubToken: "ghu_test" },
      })),
      fetchBundleFromOneNote: jest.fn(async () => ({
        schemaVersion: 1,
        createdAt: "2026-05-27T12:00:00Z",
        period: { year: 2026, month: 5, monthName: "May" },
        source: {
          kind: "onenote",
          userId: "bi-team@yourorg.onmicrosoft.com",
          notebookName: "BI Team Notebook",
          sectionName: "Meeting Notes",
        },
        pages: [],
      })),
      generateReport: jest.fn(async () => ({
        draft: "**Subject: BI Team Monthly Report – May 2026**\n\n────────────────────────────────────────────────────────────\nPROJECT HIGHLIGHTS\n\n• No significant updates captured in the meeting notes for this area.\n\n────────────────────────────────────────────────────────────\nKEY WINS & METRICS\n\n• No significant updates captured in the meeting notes for this area.\n\n────────────────────────────────────────────────────────────\nUPCOMING PRIORITIES\n\n• No significant updates captured in the meeting notes for this area.\n\nBest regards,\nBI Team",
        auditTrail: { generatedAt: "2026-05-27T12:00:00Z", provider: "github_models", model: "openai/gpt-4.1", temperature: 0.2, maxTokens: 1200, prompts: { system: "s", user: "u" }, usage: {}, rawResponse: {} },
      })),
      writeRunArtifacts: jest.fn(async () => ({
        directory: "reports/generated/2026-05/2026-05-27T12-00-00-000Z",
        reportPath: "reports/generated/2026-05/2026-05-27T12-00-00-000Z/report.md",
        sourceBundlePath: "reports/generated/2026-05/2026-05-27T12-00-00-000Z/source-bundle.json",
        auditTrailPath: "reports/generated/2026-05/2026-05-27T12-00-00-000Z/audit-trail.json",
      })),
    };

    const result = await runReportCommand(
      { command: "run", period: { year: 2026, month: 5, monthName: "May" } },
      deps as never,
    );

    expect(result.directory).toContain("reports/generated/2026-05/");
    expect(deps.writeRunArtifacts).toHaveBeenCalledTimes(1);
  });
});
