import { describe, expect, test } from "@jest/globals";
import { renderHelpText } from "../cli/parse-args.js";

describe("renderHelpText", () => {
  test("describes the local run and rerender commands", () => {
    const help = renderHelpText();

    expect(help).toContain("monthly-reports run [--period YYYY-MM] [--model MODEL_ID]");
    expect(help).toContain("monthly-reports rerender --bundle <path> [--model MODEL_ID]");
    expect(help).not.toContain("@bi-reports");
    expect(help).not.toContain("POST /agent");
  });
});
