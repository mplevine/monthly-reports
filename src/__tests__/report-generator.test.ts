import { describe, expect, jest, test } from "@jest/globals";
import { generateReport } from "../report-generator.js";
import {
  ModelProvider,
  OneNoteSourceBundle,
  ReportGenerationResult,
} from "../types.js";

const MAY_2026_BUNDLE: OneNoteSourceBundle = {
  schemaVersion: 1,
  createdAt: "2026-05-31T12:00:00Z",
  period: {
    month: 5,
    monthName: "May",
    year: 2026,
  },
  source: {
    kind: "onenote",
    userId: "bi.team@example.com",
    notebookName: "BI Team",
    sectionName: "Meeting Notes",
  },
  pages: [
    {
      id: "page-1",
      title: "May 1 Team Standup",
      content: "Discussed Q2 dashboard rollout. Timeline on track.",
      createdDateTime: "2026-05-01T10:00:00Z",
      lastModifiedDateTime: "2026-05-01T10:30:00Z",
    },
    {
      id: "page-2",
      title: "May 15 Sprint Review",
      content: "Completed data pipeline migration. 3 stories delivered.",
      createdDateTime: "2026-05-15T14:00:00Z",
      lastModifiedDateTime: "2026-05-15T15:00:00Z",
    },
  ],
};

describe("generateReport", () => {
  test("builds prompts, calls the provider, and returns an audited report draft", async () => {
    const generate = jest.fn<
      ModelProvider["generate"]
    >(async (): Promise<ReportGenerationResult["auditTrail"] & { content: string }> => ({
      content:
        "────────────────────────────────────────────────────────────\nPROJECT HIGHLIGHTS\n\n- Dashboard rollout remained on track.\n\n────────────────────────────────────────────────────────────\nKEY WINS & METRICS\n\n- Completed the data pipeline migration.\n\n────────────────────────────────────────────────────────────\nUPCOMING PRIORITIES\n\n- Finalize leadership dashboard enablement.\n\nBest regards,\nBI Team",
      usage: { prompt_tokens: 100, completion_tokens: 25 },
      rawResponse: { id: "resp-123" },
      generatedAt: "ignored",
      model: "ignored",
      prompts: { system: "ignored", user: "ignored" },
    }));

    const provider: ModelProvider = { id: "github_models", generate };

    const result = await generateReport(
      MAY_2026_BUNDLE,
      provider,
      "openai/gpt-4.1",
      0.2,
      1200,
    );

    expect(generate).toHaveBeenCalledWith({
      model: "openai/gpt-4.1",
      temperature: 0.2,
      maxTokens: 1200,
      messages: [
        expect.objectContaining({
          role: "system",
          content: expect.stringContaining("Return a leadership email body for May 2026"),
        }),
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("Q2 dashboard rollout"),
        }),
      ],
    });
    expect(result.draft.startsWith(`**Subject: BI Team Monthly Report – May 2026**

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS
`)).toBe(true);
    expect(result.draft).toContain("Dashboard rollout remained on track.");
    expect(result.auditTrail.model).toBe("openai/gpt-4.1");
    expect(result.auditTrail.generation).toEqual({
      provider: "github_models",
      temperature: 0.2,
      maxTokens: 1200,
    });
    expect(result.auditTrail.usage).toEqual({
      prompt_tokens: 100,
      completion_tokens: 25,
    });
    expect(result.auditTrail.rawResponse).toEqual({ id: "resp-123" });
  });
});
