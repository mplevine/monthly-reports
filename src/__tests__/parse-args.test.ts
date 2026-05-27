import { afterAll, beforeAll, describe, expect, jest, test } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { parseCliArgs } from "../cli/parse-args.js";

describe("parseCliArgs", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("parses run with an explicit --period", () => {
    expect(parseCliArgs(["run", "--period", "2026-05"])).toEqual({
      command: "run",
      period: { year: 2026, month: 5, monthName: "May" },
      modelOverride: undefined,
    });
  });

  test("defaults run to the previous calendar month", () => {
    expect(parseCliArgs(["run"])).toEqual({
      command: "run",
      period: { year: 2026, month: 5, monthName: "May" },
      modelOverride: undefined,
    });
  });

  test("requires --bundle for rerender", () => {
    expect(() => parseCliArgs(["rerender"])).toThrow(
      'Missing required argument "--bundle" for the rerender command.',
    );
  });

  test("requires a value for --model", () => {
    expect(() => parseCliArgs(["run", "--model"])).toThrow(
      'Missing value for "--model".',
    );
  });

  test("rejects unknown positional tokens", () => {
    expect(() => parseCliArgs(["run", "garbage"])).toThrow(
      'Unexpected positional argument "garbage" for the run command.',
    );
  });

  test("requires a real bundle path for rerender", () => {
    expect(() => parseCliArgs(["rerender", "--bundle", "--model"])).toThrow(
      'Missing value for "--bundle".',
    );
  });

  test("requires a value for --period", () => {
    expect(() => parseCliArgs(["run", "--period"])).toThrow(
      'Missing value for "--period".',
    );
  });

  test("rejects unknown flags", () => {
    expect(() => parseCliArgs(["run", "--bogus", "value"])).toThrow(
      'Unknown argument "--bogus" for the run command.',
    );
  });

  test("defaults to the previous UTC calendar month in positive-offset time zones", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--loader",
        "ts-node/esm",
        "--input-type=module",
        "--eval",
        [
          'import { parseCliArgs } from "./src/cli/parse-args.ts";',
          'console.log(JSON.stringify(parseCliArgs(["run"], new Date("2026-01-15T12:00:00Z"))));',
        ].join(" "),
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          TZ: "Pacific/Kiritimati",
        },
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      command: "run",
      period: { year: 2025, month: 12, monthName: "December" },
    });
  });
});
