import { describe, expect, test } from "@jest/globals";
import { loadAppConfig } from "../app-config.js";

describe("loadAppConfig", () => {
  test("loads checked-in defaults and injects the local GitHub token", async () => {
    process.env.GITHUB_TOKEN = "ghu_test_token";

    const config = await loadAppConfig(
      new URL("../../monthly-reports.config.json", import.meta.url),
    );

    expect(config.onenote.notebookName).toBe("BI Team Notebook");
    expect(config.generation.provider).toBe("github_models");
    expect(config.secrets.githubToken).toBe("ghu_test_token");
  });
});
