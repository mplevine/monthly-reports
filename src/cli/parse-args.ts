import { CliCommand, ReportPeriod } from "../types.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function buildPeriod(year: number, month: number): ReportPeriod {
  return { year, month, monthName: MONTH_NAMES[month - 1] };
}

function defaultPeriod(now: Date): ReportPeriod {
  const previous = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  return buildPeriod(previous.getUTCFullYear(), previous.getUTCMonth() + 1);
}

function parsePeriod(value: string): ReportPeriod {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid --period value "${value}". Use YYYY-MM.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid --period value "${value}". Month must be 01-12.`);
  }

  return buildPeriod(year, month);
}

export function parseCliArgs(argv: string[], now = new Date()): CliCommand {
  const [command, ...rest] = argv;
  const args = new Map<string, string>();

  for (let index = 0; index < rest.length; index += 2) {
    args.set(rest[index], rest[index + 1]);
  }

  if (command === "run") {
    return {
      command,
      period: args.has("--period") ? parsePeriod(args.get("--period")!) : defaultPeriod(now),
      modelOverride: args.get("--model"),
    };
  }

  if (command === "rerender") {
    const bundlePath = args.get("--bundle");
    if (!bundlePath) {
      throw new Error('Missing required argument "--bundle" for the rerender command.');
    }

    return {
      command,
      bundlePath,
      modelOverride: args.get("--model"),
    };
  }

  throw new Error(`Unknown command "${command ?? ""}". Use "run" or "rerender".`);
}
