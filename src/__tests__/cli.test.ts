import { describe, expect, test } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

describe("cli entrypoint", () => {
  test("prints usage and exits 0 when no arguments are provided", () => {
    const result = spawnSync(
      process.execPath,
      ["--loader", "ts-node/esm", "src/cli.ts"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("monthly-reports run [--period YYYY-MM] [--model MODEL_ID]");
    expect(result.stdout).toContain("monthly-reports rerender --bundle <path> [--model MODEL_ID]");
    expect(result.stdout).toContain("Fetch OneNote notes, generate a report draft, and write artifacts.");
  });

  test.each([
    "--help",
    "-h",
  ])("prints usage and exits 0 for %s", (flag) => {
    const result = spawnSync(
      process.execPath,
      ["--loader", "ts-node/esm", "src/cli.ts", flag],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("monthly-reports run [--period YYYY-MM] [--model MODEL_ID]");
    expect(result.stdout).toContain("monthly-reports rerender --bundle <path> [--model MODEL_ID]");
  });

  test("routes rerender through the bundle loader path", () => {
    const result = spawnSync(
      process.execPath,
      ["--loader", "ts-node/esm", "src/cli.ts", "rerender", "--bundle", "bundle.json"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_TOKEN: "ghu_test",
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("bundle.json");
    expect(result.stderr).not.toContain("at file:///");
  });

  test("does not execute when imported as a module", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--loader",
        "ts-node/esm",
        "--input-type=module",
        "--eval",
        'await import("./src/cli.ts"); console.log("loaded");',
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("loaded");
  });

  test("declares the monthly-reports executable in package metadata", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { bin?: Record<string, string> };

    expect(packageJson.bin).toEqual({
      "monthly-reports": "dist/cli.js",
    });
  });

  test("starts the CLI source with a node shebang", () => {
    const cliSource = readFileSync(new URL("../cli.ts", import.meta.url), "utf8");

    expect(cliSource.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  test("cleans dist before building", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.build).toContain("rmSync");
  });
});
