import { parseCliArgs } from "./cli/parse-args.js";
import { pathToFileURL } from "node:url";

const HELP_TEXT = `Usage:
  monthly-reports run [--period YYYY-MM] [--model MODEL]
  monthly-reports rerender --bundle PATH [--model MODEL]
`;

function isHelpRequest(argv: string[]): boolean {
  return argv.length === 0 || argv.includes("--help") || argv.includes("-h");
}

export function main(argv: string[] = process.argv.slice(2)): number {
  if (isHelpRequest(argv)) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  parseCliArgs(argv);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
