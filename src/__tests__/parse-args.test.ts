import { afterAll, beforeAll, describe, expect, jest, test } from "@jest/globals";
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
});
