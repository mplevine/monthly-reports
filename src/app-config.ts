import { readFile } from "node:fs/promises";
import { AppConfig, RepoConfigFile } from "./types.js";

const DEFAULT_CONFIG_URL = new URL("../monthly-reports.config.json", import.meta.url);

export async function loadAppConfig(
  configUrl: URL = DEFAULT_CONFIG_URL,
): Promise<AppConfig> {
  const raw = await readFile(configUrl, "utf8");
  const parsed = JSON.parse(raw) as RepoConfigFile;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error(
      "Missing GITHUB_TOKEN. Export a PAT with the models scope before running the CLI.",
    );
  }

  return {
    ...parsed,
    secrets: {
      githubToken,
    },
  };
}
