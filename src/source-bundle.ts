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
  return JSON.parse(raw) as OneNoteSourceBundle;
}
