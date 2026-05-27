import { describe, expect, test } from "@jest/globals";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSourceBundle, loadSourceBundle } from "../source-bundle.js";

const TEST_OUTPUT_DIRECTORY = join(process.cwd(), "reports", "generated");

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

  test("rejects bundles with unsupported schema versions", async () => {
    await mkdir(TEST_OUTPUT_DIRECTORY, { recursive: true });
    const bundlePath = join(
      TEST_OUTPUT_DIRECTORY,
      `monthly-reports-invalid-schema-${Date.now()}.json`,
    );
    try {
      await writeFile(
        bundlePath,
        JSON.stringify({
          schemaVersion: 2,
          createdAt: "2026-05-01T00:00:00Z",
          period: { year: 2026, month: 5, monthName: "May" },
          source: {
            kind: "onenote",
            userId: "bi-team@yourorg.onmicrosoft.com",
            notebookName: "BI Team Notebook",
            sectionName: "Meeting Notes",
          },
          pages: [],
        }),
        "utf8",
      );

      await expect(loadSourceBundle(bundlePath)).rejects.toThrow(
        "Unsupported source bundle schemaVersion: 2",
      );
    } finally {
      await rm(bundlePath, { force: true });
    }
  });

  test("rejects malformed bundle structure", async () => {
    await mkdir(TEST_OUTPUT_DIRECTORY, { recursive: true });
    const bundlePath = join(
      TEST_OUTPUT_DIRECTORY,
      `monthly-reports-malformed-bundle-${Date.now()}.json`,
    );
    try {
      await writeFile(
        bundlePath,
        JSON.stringify({
          schemaVersion: 1,
          createdAt: "2026-05-01T00:00:00Z",
          period: "May 2026",
          source: {
            kind: "onenote",
            userId: "bi-team@yourorg.onmicrosoft.com",
            notebookName: "BI Team Notebook",
            sectionName: "Meeting Notes",
          },
          pages: [],
        }),
        "utf8",
      );

      await expect(loadSourceBundle(bundlePath)).rejects.toThrow(
        "Invalid source bundle: period must be an object.",
      );
    } finally {
      await rm(bundlePath, { force: true });
    }
  });
});
