import { describe, expect, jest, test } from "@jest/globals";

const apiCalls: string[] = [];

const fakeClient = {
  api(path: string) {
    apiCalls.push(path);

    return {
      filter() {
        return this;
      },
      select() {
        return this;
      },
      orderby() {
        return this;
      },
      header() {
        return this;
      },
      async get() {
        if (path === "/me/onenote/notebooks") {
          return {
            value: [{ id: "notebook-1", displayName: "BI Team Notebook" }],
          };
        }

        if (path === "/me/onenote/notebooks/notebook-1/sections") {
          return {
            value: [{ id: "section-1", displayName: "Meeting Notes" }],
          };
        }

        if (path === "/me/onenote/sections/section-1/pages") {
          return {
            value: [
              {
                id: "page-1",
                title: "May 1 Standup",
                createdDateTime: "2026-05-01T14:00:00Z",
                lastModifiedDateTime: "2026-05-01T14:30:00Z",
              },
            ],
          };
        }

        if (path === "/me/onenote/pages/page-1/content") {
          return "<p>Discussed Q2 dashboard rollout.</p>";
        }

        throw new Error(`Unexpected Graph path: ${path}`);
      },
    };
  },
};

jest.unstable_mockModule("@microsoft/microsoft-graph-client", () => ({
  Client: {
    initWithMiddleware: jest.fn(() => fakeClient),
  },
}));

jest.unstable_mockModule("node-html-markdown", () => ({
  NodeHtmlMarkdown: {
    translate: jest.fn(() => "Discussed Q2 dashboard rollout."),
  },
}));

const { fetchOneNotePages } = await import("../onenote.js");

describe("fetchOneNotePages", () => {
  test("uses delegated /me OneNote endpoints", async () => {
    apiCalls.length = 0;

    await fetchOneNotePages(
      {
        tenantId: "tenant-id",
        clientId: "client-id",
        userId: "bi-team@yourorg.onmicrosoft.com",
        notebookName: "BI Team Notebook",
        sectionName: "Meeting Notes",
      },
      "graph-token",
      { year: 2026, month: 5, monthName: "May" },
    );

    expect(apiCalls).toContain("/me/onenote/notebooks");
    expect(apiCalls).toContain("/me/onenote/notebooks/notebook-1/sections");
    expect(apiCalls).toContain("/me/onenote/sections/section-1/pages");
    expect(apiCalls).toContain("/me/onenote/pages/page-1/content");
  });
});
