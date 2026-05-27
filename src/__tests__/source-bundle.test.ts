import { describe, expect, test } from "@jest/globals";
import { buildSourceBundle } from "../source-bundle.js";

describe("buildSourceBundle", () => {
  test("captures normalized page content and source metadata", () => {
    const bundle = buildSourceBundle(
      {
        tenantId: "tenant-id",
        clientId: "client-id",
        userId: "bi-team@yourorg.onmicrosoft.com",
        notebookName: "BI Team Notebook",
        sectionName: "Meeting Notes",
      },
      { year: 2026, month: 5, monthName: "May" },
      [
        {
          id: "page-1",
          title: "May 1 Standup",
          content: "\n  Discussed Q2 dashboard rollout.  \n",
          createdDateTime: "2026-05-01T14:00:00Z",
          lastModifiedDateTime: "2026-05-01T14:30:00Z",
        },
      ],
    );

    expect(bundle.source.kind).toBe("onenote");
    expect(bundle.pages[0].content).toBe("Discussed Q2 dashboard rollout.");
    expect(bundle.period).toEqual({ year: 2026, month: 5, monthName: "May" });
  });
});
