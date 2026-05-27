import { parseCliArgs, renderHelpText } from "./cli/parse-args.js";
import { rerenderReportCommand } from "./commands/rerender-report.js";
import { runReportCommand } from "./commands/run-report.js";
import { pathToFileURL } from "node:url";

function isHelpRequest(argv: string[]): boolean {
  return argv.length === 0 || argv.includes("--help") || argv.includes("-h");
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  if (isHelpRequest(argv)) {
    process.stdout.write(renderHelpText());
    return 0;
  }

  const command = parseCliArgs(argv);
  const result =
    command.command === "run"
      ? await runReportCommand(command)
      : await rerenderReportCommand(command);

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
