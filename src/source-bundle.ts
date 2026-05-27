import { readFile } from "node:fs/promises";
import {
  OneNotePage,
  OneNoteSourceBundle,
  ReportPeriod,
  RepoConfigFile,
} from "./types.js";

export function buildSourceBundle(
  onenote: RepoConfigFile["onenote"],
  period: ReportPeriod,
  pages: OneNotePage[],
): OneNoteSourceBundle {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    period,
    source: {
      kind: "onenote",
      userId: onenote.userId,
      notebookName: onenote.notebookName,
      sectionName: onenote.sectionName,
    },
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title,
      content: page.content.trim(),
      createdDateTime: page.createdDateTime,
      lastModifiedDateTime: page.lastModifiedDateTime,
    })),
  };
}

export async function loadSourceBundle(
  filePath: string,
): Promise<OneNoteSourceBundle> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return validateSourceBundle(parsed);
}

function validateSourceBundle(bundle: unknown): OneNoteSourceBundle {
  if (!isRecord(bundle)) {
    throw new Error("Invalid source bundle: top-level value must be an object.");
  }

  if (bundle.schemaVersion !== 1) {
    throw new Error(
      `Unsupported source bundle schemaVersion: ${String(bundle.schemaVersion)}`,
    );
  }

  if (typeof bundle.createdAt !== "string") {
    throw new Error("Invalid source bundle: createdAt must be a string.");
  }

  if (!isRecord(bundle.period)) {
    throw new Error("Invalid source bundle: period must be an object.");
  }

  if (typeof bundle.period.year !== "number") {
    throw new Error("Invalid source bundle: period.year must be a number.");
  }

  if (typeof bundle.period.month !== "number") {
    throw new Error("Invalid source bundle: period.month must be a number.");
  }

  if (typeof bundle.period.monthName !== "string") {
    throw new Error("Invalid source bundle: period.monthName must be a string.");
  }

  if (!isRecord(bundle.source)) {
    throw new Error("Invalid source bundle: source must be an object.");
  }

  if (bundle.source.kind !== "onenote") {
    throw new Error("Invalid source bundle: source.kind must be 'onenote'.");
  }

  if (typeof bundle.source.userId !== "string") {
    throw new Error("Invalid source bundle: source.userId must be a string.");
  }

  if (typeof bundle.source.notebookName !== "string") {
    throw new Error(
      "Invalid source bundle: source.notebookName must be a string.",
    );
  }

  if (typeof bundle.source.sectionName !== "string") {
    throw new Error(
      "Invalid source bundle: source.sectionName must be a string.",
    );
  }

  if (!Array.isArray(bundle.pages)) {
    throw new Error("Invalid source bundle: pages must be an array.");
  }

  for (const page of bundle.pages) {
    if (!isRecord(page)) {
      throw new Error("Invalid source bundle: each page must be an object.");
    }

    if (typeof page.id !== "string") {
      throw new Error("Invalid source bundle: page.id must be a string.");
    }

    if (typeof page.title !== "string") {
      throw new Error("Invalid source bundle: page.title must be a string.");
    }

    if (typeof page.content !== "string") {
      throw new Error("Invalid source bundle: page.content must be a string.");
    }

    if (typeof page.createdDateTime !== "string") {
      throw new Error(
        "Invalid source bundle: page.createdDateTime must be a string.",
      );
    }

    if (typeof page.lastModifiedDateTime !== "string") {
      throw new Error(
        "Invalid source bundle: page.lastModifiedDateTime must be a string.",
      );
    }
  }

  return bundle as unknown as OneNoteSourceBundle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
