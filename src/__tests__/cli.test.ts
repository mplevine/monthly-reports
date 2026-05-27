import { describe, expect, test } from "@jest/globals";
import { spawnSync } from "node:child_process";

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
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("monthly-reports run");
    expect(result.stdout).toContain("monthly-reports rerender --bundle PATH");
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
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("monthly-reports rerender --bundle PATH");
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
});
