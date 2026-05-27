import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  OneNoteSourceBundle,
  ReportGenerationResult,
  ReportPeriod,
  RepoConfigFile,
  RunArtifacts,
} from "./types.js";

export async function writeRunArtifacts(
  output: RepoConfigFile["output"],
  period: ReportPeriod,
  bundle: OneNoteSourceBundle,
  generation: ReportGenerationResult,
): Promise<RunArtifacts> {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const periodDirectory = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const directory = path.join(output.rootDirectory, periodDirectory, runId);
  await mkdir(directory, { recursive: true });

  const reportPath = path.join(directory, "report.md");
  const sourceBundlePath = path.join(directory, "source-bundle.json");
  const auditTrailPath = path.join(directory, "audit-trail.json");

  await writeFile(reportPath, generation.draft, "utf8");
  await writeFile(sourceBundlePath, JSON.stringify(bundle, null, 2), "utf8");
  await writeFile(auditTrailPath, JSON.stringify(generation.auditTrail, null, 2), "utf8");

  return { directory, reportPath, sourceBundlePath, auditTrailPath };
}
