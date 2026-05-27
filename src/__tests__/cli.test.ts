import { describe, expect, test } from "@jest/globals";
import { spawnSync } from "node:child_process";

describe("cli entrypoint", () => {
  test("prints usage for --help", () => {
    const result = spawnSync(
      process.execPath,
      ["--loader", "ts-node/esm", "src/cli.ts", "--help"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("run");
    expect(result.stdout).toContain("rerender");
  });
});
