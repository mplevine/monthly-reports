import { parseCliArgs } from "./cli/parse-args.js";
import { runReportCommand } from "./commands/run-report.js";
import { pathToFileURL } from "node:url";

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
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
