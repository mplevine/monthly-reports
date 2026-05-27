import { CliCommand, ReportPeriod } from "../types.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function buildPeriod(year: number, month: number): ReportPeriod {
  return { year, month, monthName: MONTH_NAMES[month - 1] };
}

function defaultPeriod(now: Date): ReportPeriod {
  const currentUtcMonth = now.getUTCMonth() + 1;
  const year = currentUtcMonth === 1 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = currentUtcMonth === 1 ? 12 : currentUtcMonth - 1;
  return buildPeriod(year, month);
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

function parseOptions(
  command: "run" | "rerender",
  tokens: string[],
): Map<string, string> {
  const allowedFlags = new Set(
    command === "run" ? ["--period", "--model"] : ["--bundle", "--model"],
  );
  const args = new Map<string, string>();

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument "${token}" for the ${command} command.`);
    }

    if (!allowedFlags.has(token)) {
      throw new Error(`Unknown argument "${token}" for the ${command} command.`);
    }

    const value = tokens[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for "${token}".`);
    }

    args.set(token, value);
    index += 1;
  }

  return args;
}

export function parseCliArgs(argv: string[], now = new Date()): CliCommand {
  const [command, ...rest] = argv;

  if (command === "run") {
    const args = parseOptions(command, rest);
    return {
      command,
      period: args.has("--period") ? parsePeriod(args.get("--period")!) : defaultPeriod(now),
      modelOverride: args.get("--model"),
    };
  }

  if (command === "rerender") {
    const args = parseOptions(command, rest);
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
