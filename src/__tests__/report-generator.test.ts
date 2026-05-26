import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { prompt } from "@copilot-extensions/preview-sdk";
import { combineNotes, generateReport } from "../report-generator.js";
import { OneNotePage, ReportPeriod } from "../types.js";

const SAMPLE_PAGES: OneNotePage[] = [
  {
    id: "page-1",
    title: "May 1 Team Standup",
    content: "Discussed Q2 dashboard rollout. Timeline on track.",
    createdDateTime: "2025-05-01T10:00:00Z",
    lastModifiedDateTime: "2025-05-01T10:30:00Z",
  },
  {
    id: "page-2",
    title: "May 15 Sprint Review",
    content: "Completed data pipeline migration. 3 stories delivered.",
    createdDateTime: "2025-05-15T14:00:00Z",
    lastModifiedDateTime: "2025-05-15T15:00:00Z",
  },
];

const MAY_2025: ReportPeriod = { month: 5, year: 2025, monthName: "May" };

const mockPrompt = prompt as jest.MockedFunction<typeof prompt>;

describe("combineNotes", () => {
  test("combines all pages into a single document", () => {
    const result = combineNotes(SAMPLE_PAGES);
    expect(result).toContain("May 1 Team Standup");
    expect(result).toContain("May 15 Sprint Review");
    expect(result).toContain("Q2 dashboard rollout");
    expect(result).toContain("data pipeline migration");
  });

  test("uses markdown headings for each page title", () => {
    const result = combineNotes(SAMPLE_PAGES);
    expect(result).toContain("## May 1 Team Standup");
    expect(result).toContain("## May 15 Sprint Review");
  });

  test("separates pages with a horizontal rule", () => {
    const result = combineNotes(SAMPLE_PAGES);
    expect(result).toContain("---");
  });

  test("returns empty string for an empty page array", () => {
    const result = combineNotes([]);
    expect(result).toBe("");
  });

  test("handles a single page without a separator", () => {
    const result = combineNotes([SAMPLE_PAGES[0]]);
    expect(result).toContain("## May 1 Team Standup");
    expect(result).not.toContain("---");
  });
});

describe("generateReport", () => {
  beforeEach(() => {
    mockPrompt.mockReset();
  });

  test("calls the Copilot prompt with system and user messages", async () => {
    mockPrompt.mockResolvedValue({
      message: {
        role: "assistant",
        content: "Hi Leadership,\n\nHere is the May 2025 update.",
      },
      requestId: "req-123",
    } as Awaited<ReturnType<typeof prompt>>);

    const result = await generateReport(SAMPLE_PAGES, MAY_2025, "test-token");

    expect(mockPrompt).toHaveBeenCalledTimes(1);
    const callArgs = mockPrompt.mock.calls[0][0] as {
      token: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(callArgs.token).toBe("test-token");
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
  });

  test("wraps the AI response in the email template", async () => {
    mockPrompt.mockResolvedValue({
      message: {
        role: "assistant",
        content: "Hi Leadership,\n\nHere is the May 2025 update.",
      },
      requestId: "req-123",
    } as Awaited<ReturnType<typeof prompt>>);

    const result = await generateReport(SAMPLE_PAGES, MAY_2025, "test-token");

    expect(result).toContain("Subject: BI Team Monthly Report – May 2025");
    expect(result).toContain("May 2025 update");
  });

  test("passes the meeting notes content to the LLM", async () => {
    mockPrompt.mockResolvedValue({
      message: { role: "assistant", content: "Email body." },
      requestId: "req-456",
    } as Awaited<ReturnType<typeof prompt>>);

    await generateReport(SAMPLE_PAGES, MAY_2025, "test-token");

    const callArgs = mockPrompt.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMsg = callArgs.messages[1].content;
    expect(userMsg).toContain("Q2 dashboard rollout");
    expect(userMsg).toContain("data pipeline migration");
  });
});

