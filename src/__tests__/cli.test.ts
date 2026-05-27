import { describe, expect, test } from "@jest/globals";
import { spawnSync } from "node:child_process";

describe("cli entrypoint", () => {
  test("rejects rerender until that command is implemented", () => {
    const result = spawnSync(
      process.execPath,
      ["--loader", "ts-node/esm", "src/cli.ts", "rerender", "--bundle", "bundle.json"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Rerender is not available in this build.");
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
