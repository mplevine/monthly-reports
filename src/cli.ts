import { parseCliArgs } from "./cli/parse-args.js";
import { runReportCommand } from "./commands/run-report.js";
import { pathToFileURL } from "node:url";

const HELP_TEXT = `Usage:
  monthly-reports run [--period YYYY-MM] [--model MODEL]

rerender is not available in this build.
`;

function isHelpRequest(argv: string[]): boolean {
  return argv.length === 0 || argv.includes("--help") || argv.includes("-h");
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  if (isHelpRequest(argv)) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  const command = parseCliArgs(argv);

  if (command.command !== "run") {
    throw new Error("Rerender is not available in this build.");
  }

  const result = await runReportCommand(command);

  console.log(`Report draft written to ${result.reportPath}`);
  console.log(`Source bundle written to ${result.sourceBundlePath}`);
  console.log(`Audit trail written to ${result.auditTrailPath}`);

  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
