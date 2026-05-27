# Local CLI Report Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hosted Copilot Extension with a repo-local CLI that fetches OneNote notes, generates a validated leadership draft through GitHub Models, and writes durable run artifacts.

**Architecture:** Keep the existing Node/TypeScript core, but move orchestration into a local CLI with two commands: `run` and `rerender`. Split the workflow into focused modules for checked-in config loading, delegated OneNote auth, source-bundle creation, prompt rendering, GitHub Models generation, report validation, and artifact writing. Keep prompt templates and non-secret defaults in the repo, keep secrets in local environment variables, and persist MSAL tokens outside the repo with a secure cache plugin.

**Tech Stack:** Node.js 20, TypeScript (NodeNext), Jest + ts-jest, Microsoft Graph API, `@azure/msal-node`, `@azure/msal-node-extensions`, GitHub Models REST API, `node-html-markdown`

---

## File Structure

- `monthly-reports.config.json` — checked-in workflow defaults for OneNote source, GitHub Models defaults, and output directory.
- `prompts/report-system.md` — checked-in system prompt template with explicit required section headings.
- `prompts/report-user.md` — checked-in user prompt template that injects the normalized note corpus.
- `src/app-config.ts` — loads `monthly-reports.config.json`, injects local secrets from the environment, and returns a typed runtime config.
- `src/cli.ts` — process entrypoint that dispatches `run` and `rerender`.
- `src/cli/parse-args.ts` — parses CLI subcommands, `--period`, `--bundle`, and optional `--model`.
- `src/onenote-auth.ts` — delegated MSAL auth with silent-first acquisition and persistent token cache.
- `src/onenote.ts` — fetches OneNote pages with a bearer token and normalizes them into `OneNotePage`.
- `src/source-bundle.ts` — builds and loads the machine-readable source bundle.
- `src/github-models.ts` — provider implementation for `https://models.github.ai/inference/chat/completions`.
- `src/prompt-loader.ts` — loads prompt templates from `prompts/` and resolves placeholders.
- `src/report-generator.ts` — combines the source bundle, prompt templates, provider call, email formatting, and audit-trail assembly.
- `src/report-validator.ts` — enforces the canonical leadership email shape and fails loudly when it drifts.
- `src/artifacts.ts` — creates timestamped run directories and writes `report.md`, `source-bundle.json`, and `audit-trail.json`.
- `src/commands/run-report.ts` — end-to-end report run orchestration from live OneNote data.
- `src/commands/rerender-report.ts` — rerenders a report draft from an existing source bundle without refetching OneNote.
- `src/types.ts` — shared domain and runtime types for config, source bundles, audit trails, provider responses, and CLI commands.
- `src/__tests__/app-config.test.ts` — checked-in config and local secret loading tests.
- `src/__tests__/parse-args.test.ts` — CLI argument parsing tests.
- `src/__tests__/onenote-auth.test.ts` — silent-first MSAL acquisition tests.
- `src/__tests__/source-bundle.test.ts` — source-bundle normalization and loading tests.
- `src/__tests__/github-models.test.ts` — provider request/response mapping tests.
- `src/__tests__/report-validator.test.ts` — canonical report format validation tests.
- `src/__tests__/run-report.test.ts` — run-command orchestration tests.
- `src/__tests__/rerender-report.test.ts` — rerender-command orchestration tests.
- `src/__tests__/cli-help.test.ts` — CLI help text and public surface smoke tests.
- `README.md` — local CLI setup, auth, commands, and artifact layout.
- `.env.example` — local secrets only (`GITHUB_TOKEN` with `models` scope).
- `.gitignore` — ignore generated run artifacts.
- `package.json` — CLI scripts, dependency cleanup, and new auth dependency.
- `jest.config.json` — remove extension-specific mock wiring once the Copilot SDK is gone.
- Delete `src/index.ts`, `src/agent.ts`, `src/period-parser.ts`, `src/__tests__/period-parser.test.ts`, and `src/__mocks__/copilot-sdk.ts` once the CLI path is complete.

### Task 1: Establish the checked-in config and CLI parsing foundation

**Files:**
- Create: `monthly-reports.config.json`
- Create: `src/app-config.ts`
- Create: `src/cli/parse-args.ts`
- Test: `src/__tests__/app-config.test.ts`
- Test: `src/__tests__/parse-args.test.ts`
- Modify: `src/types.ts`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing tests for checked-in config loading and CLI parsing**

```ts
// src/__tests__/app-config.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadAppConfig } from "../app-config.js";

describe("loadAppConfig", () => {
  test("loads checked-in defaults and injects the local GitHub token", async () => {
    process.env.GITHUB_TOKEN = "ghu_test_token";

    const config = await loadAppConfig(
      new URL("../../monthly-reports.config.json", import.meta.url),
    );

    expect(config.onenote.notebookName).toBe("BI Team Notebook");
    expect(config.generation.provider).toBe("github_models");
    expect(config.secrets.githubToken).toBe("ghu_test_token");
  });
});
```

```ts
// src/__tests__/parse-args.test.ts
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
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- --runTestsByPath src/__tests__/app-config.test.ts src/__tests__/parse-args.test.ts`

Expected: FAIL with module resolution errors for `../app-config.js` and `../cli/parse-args.js`.

- [ ] **Step 3: Implement the runtime config types, checked-in config file, CLI parser, and package scripts**

```json
// monthly-reports.config.json
{
  "onenote": {
    "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "userId": "bi-team@yourorg.onmicrosoft.com",
    "notebookName": "BI Team Notebook",
    "sectionName": "Meeting Notes"
  },
  "generation": {
    "provider": "github_models",
    "model": "openai/gpt-4.1",
    "temperature": 0.2,
    "maxTokens": 1200
  },
  "output": {
    "rootDirectory": "reports/generated"
  }
}
```

```ts
// src/app-config.ts
import { readFile } from "node:fs/promises";
import { AppConfig, RepoConfigFile } from "./types.js";

const DEFAULT_CONFIG_URL = new URL("../monthly-reports.config.json", import.meta.url);

export async function loadAppConfig(
  configUrl: URL = DEFAULT_CONFIG_URL,
): Promise<AppConfig> {
  const raw = await readFile(configUrl, "utf8");
  const parsed = JSON.parse(raw) as RepoConfigFile;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error(
      "Missing GITHUB_TOKEN. Export a PAT with the models scope before running the CLI.",
    );
  }

  return {
    ...parsed,
    secrets: {
      githubToken,
    },
  };
}
```

```ts
// src/cli/parse-args.ts
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
```

```ts
// src/types.ts
export interface RepoConfigFile {
  onenote: {
    tenantId: string;
    clientId: string;
    userId: string;
    notebookName: string;
    sectionName: string;
  };
  generation: {
    provider: "github_models";
    model: string;
    temperature: number;
    maxTokens: number;
  };
  output: {
    rootDirectory: string;
  };
}

export interface AppConfig extends RepoConfigFile {
  secrets: {
    githubToken: string;
  };
}

export type CliCommand =
  | { command: "run"; period: ReportPeriod; modelOverride?: string }
  | { command: "rerender"; bundlePath: string; modelOverride?: string };
```

```json
// package.json (scripts excerpt)
{
  "scripts": {
    "build": "tsc",
    "report": "node dist/cli.js run",
    "rerender": "node dist/cli.js rerender",
    "dev": "node --loader ts-node/esm src/cli.ts",
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage"
  }
}
```

```dotenv
# .env.example
# Local secrets only. Keep this file out of source control once copied to .env.
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

- [ ] **Step 4: Run the focused tests again**

Run: `npm test -- --runTestsByPath src/__tests__/app-config.test.ts src/__tests__/parse-args.test.ts`

Expected: PASS with 2 test files and 4 passing tests.

- [ ] **Step 5: Commit the foundation**

```bash
git add monthly-reports.config.json src/app-config.ts src/cli/parse-args.ts src/types.ts src/__tests__/app-config.test.ts src/__tests__/parse-args.test.ts package.json .env.example
git commit -m "feat: add local cli config foundation"
```

### Task 2: Replace app-only OneNote auth with delegated auth and source bundles

**Files:**
- Create: `src/onenote-auth.ts`
- Create: `src/source-bundle.ts`
- Test: `src/__tests__/onenote-auth.test.ts`
- Test: `src/__tests__/source-bundle.test.ts`
- Modify: `src/onenote.ts`
- Modify: `src/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing tests for delegated auth fallback and source-bundle normalization**

```ts
// src/__tests__/onenote-auth.test.ts
import { describe, expect, jest, test } from "@jest/globals";
import { getGraphAccessToken } from "../onenote-auth.js";

describe("getGraphAccessToken", () => {
  test("uses interactive sign-in after silent auth misses", async () => {
    const app = {
      getAllAccounts: jest.fn(async () => []),
      acquireTokenSilent: jest.fn(),
      acquireTokenInteractive: jest.fn(async () => ({ accessToken: "graph-token" })),
      acquireTokenByDeviceCode: jest.fn(),
    };

    await expect(
      getGraphAccessToken(app as never, "bi-team@yourorg.onmicrosoft.com"),
    ).resolves.toBe("graph-token");
    expect(app.acquireTokenInteractive).toHaveBeenCalledTimes(1);
  });
});
```

```ts
// src/__tests__/source-bundle.test.ts
import { describe, expect, test } from "@jest/globals";
import { buildSourceBundle } from "../source-bundle.js";

describe("buildSourceBundle", () => {
  test("captures normalized page content and source metadata", () => {
    const bundle = buildSourceBundle(
      {
        tenantId: "tenant-id",
        clientId: "client-id",
        userId: "bi-team@yourorg.onmicrosoft.com",
        notebookName: "BI Team Notebook",
        sectionName: "Meeting Notes",
      },
      { year: 2026, month: 5, monthName: "May" },
      [
        {
          id: "page-1",
          title: "May 1 Standup",
          content: "Discussed Q2 dashboard rollout.",
          createdDateTime: "2026-05-01T14:00:00Z",
          lastModifiedDateTime: "2026-05-01T14:30:00Z",
        },
      ],
    );

    expect(bundle.source.kind).toBe("onenote");
    expect(bundle.pages[0].content).toBe("Discussed Q2 dashboard rollout.");
    expect(bundle.period).toEqual({ year: 2026, month: 5, monthName: "May" });
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- --runTestsByPath src/__tests__/onenote-auth.test.ts src/__tests__/source-bundle.test.ts`

Expected: FAIL because `../onenote-auth.js` and `../source-bundle.js` do not exist yet.

- [ ] **Step 3: Implement silent-first delegated auth, persistent cache, source-bundle types, and bearer-token-based OneNote fetching**

```ts
// src/onenote-auth.ts
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DataProtectionScope,
  FilePersistenceWithDataProtection,
  PersistenceCachePlugin,
} from "@azure/msal-node-extensions";
import { PublicClientApplication } from "@azure/msal-node";

export async function createPublicClient(tenantId: string, clientId: string) {
  const cacheDirectory = path.join(os.homedir(), ".monthly-reports");
  const cachePath = path.join(cacheDirectory, "msal-cache.json");
  await mkdir(cacheDirectory, { recursive: true });

  const persistence = await FilePersistenceWithDataProtection.create(
    cachePath,
    DataProtectionScope.CurrentUser,
    "",
  );

  return new PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    cache: {
      cachePlugin: new PersistenceCachePlugin(persistence),
    },
  });
}

export async function getGraphAccessToken(
  app: Pick<
    PublicClientApplication,
    "getAllAccounts" | "acquireTokenSilent" | "acquireTokenInteractive" | "acquireTokenByDeviceCode"
  >,
  loginHint: string,
): Promise<string> {
  const scopes = ["Notes.Read"];
  const accounts = await app.getAllAccounts();
  const preferredAccount =
    accounts.find((account) => account.username === loginHint) ?? accounts[0];

  if (preferredAccount) {
    try {
      const silent = await app.acquireTokenSilent({
        account: preferredAccount,
        scopes,
      });
      if (silent?.accessToken) {
        return silent.accessToken;
      }
    } catch {
      // fall through to interactive auth
    }
  }

  try {
    const interactive = await app.acquireTokenInteractive({
      scopes,
      loginHint,
    });
    if (interactive?.accessToken) {
      return interactive.accessToken;
    }
  } catch {
    const device = await app.acquireTokenByDeviceCode({
      scopes,
      deviceCodeCallback: ({ message }) => console.log(message),
    });
    if (device?.accessToken) {
      return device.accessToken;
    }
  }

  throw new Error("Failed to acquire a delegated Microsoft Graph access token.");
}
```

```ts
// src/source-bundle.ts
import { readFile } from "node:fs/promises";
import { OneNotePage, OneNoteSourceBundle, ReportPeriod, RepoConfigFile } from "./types.js";

export function buildSourceBundle(
  onenote: RepoConfigFile["onenote"],
  period: ReportPeriod,
  pages: OneNotePage[],
): OneNoteSourceBundle {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    period,
    source: {
      kind: "onenote",
      userId: onenote.userId,
      notebookName: onenote.notebookName,
      sectionName: onenote.sectionName,
    },
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title,
      content: page.content.trim(),
      createdDateTime: page.createdDateTime,
      lastModifiedDateTime: page.lastModifiedDateTime,
    })),
  };
}

export async function loadSourceBundle(filePath: string): Promise<OneNoteSourceBundle> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as OneNoteSourceBundle;
}
```

```ts
// src/onenote.ts
import { Client } from "@microsoft/microsoft-graph-client";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { OneNotePage, ReportPeriod, RepoConfigFile } from "./types.js";

function createGraphClient(accessToken: string): Client {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken,
    },
  });
}

export async function fetchOneNotePages(
  config: RepoConfigFile["onenote"],
  accessToken: string,
  period: ReportPeriod,
): Promise<OneNotePage[]> {
  const client = createGraphClient(accessToken);
  const start = new Date(Date.UTC(period.year, period.month - 1, 1)).toISOString();
  const end = new Date(Date.UTC(period.year, period.month, 1)).toISOString();
  const sectionId = await resolveSectionId(client, config);

  const pagesResponse = (await client
    .api(`/users/${config.userId}/onenote/sections/${sectionId}/pages`)
    .filter(`createdDateTime ge ${start} and createdDateTime lt ${end}`)
    .select("id,title,createdDateTime,lastModifiedDateTime")
    .orderby("createdDateTime asc")
    .get()) as { value: Array<{ id: string; title: string; createdDateTime: string; lastModifiedDateTime: string }> };

  const results: OneNotePage[] = [];
  for (const page of pagesResponse.value ?? []) {
    const htmlContent = (await client
      .api(`/users/${config.userId}/onenote/pages/${page.id}/content`)
      .header("Accept", "text/html")
      .get()) as string;

    results.push({
      id: page.id,
      title: page.title ?? "(Untitled)",
      content: NodeHtmlMarkdown.translate(htmlContent ?? "").trim(),
      createdDateTime: page.createdDateTime,
      lastModifiedDateTime: page.lastModifiedDateTime,
    });
  }

  return results;
}
```

```ts
// src/types.ts (new bundle types excerpt)
export interface OneNoteSourceBundle {
  schemaVersion: 1;
  createdAt: string;
  period: ReportPeriod;
  source: {
    kind: "onenote";
    userId: string;
    notebookName: string;
    sectionName: string;
  };
  pages: OneNotePage[];
}
```

- [ ] **Step 4: Install the persistent cache dependency and rerun the focused tests**

Run: `npm install @azure/msal-node-extensions`

Expected: `package-lock.json` updates and install completes without errors.

Run: `npm test -- --runTestsByPath src/__tests__/onenote-auth.test.ts src/__tests__/source-bundle.test.ts`

Expected: PASS with delegated-auth fallback and source-bundle tests green.

- [ ] **Step 5: Commit the auth and source-bundle work**

```bash
git add package.json package-lock.json src/onenote-auth.ts src/source-bundle.ts src/onenote.ts src/types.ts src/__tests__/onenote-auth.test.ts src/__tests__/source-bundle.test.ts
git commit -m "feat: add delegated onenote auth and source bundles"
```

### Task 3: Add prompt templates, GitHub Models generation, and report validation

**Files:**
- Create: `prompts/report-system.md`
- Create: `prompts/report-user.md`
- Create: `src/prompt-loader.ts`
- Create: `src/github-models.ts`
- Create: `src/report-validator.ts`
- Test: `src/__tests__/github-models.test.ts`
- Test: `src/__tests__/report-validator.test.ts`
- Test: `src/__tests__/email-template.test.ts`
- Modify: `src/report-generator.ts`
- Modify: `src/email-template.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write the failing tests for the provider call shape and canonical-format validation**

```ts
// src/__tests__/github-models.test.ts
import { describe, expect, jest, test } from "@jest/globals";
import { createGitHubModelsProvider } from "../github-models.js";

describe("createGitHubModelsProvider", () => {
  test("posts chat completions to GitHub Models", async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hi [Leadership Team]" } }],
        usage: { prompt_tokens: 100, completion_tokens: 25 },
      }),
    }));

    const provider = createGitHubModelsProvider("ghu_test_token", fetchMock as typeof fetch);
    await provider.generate({
      model: "openai/gpt-4.1",
      temperature: 0.2,
      maxTokens: 1200,
      messages: [{ role: "system", content: "system" }, { role: "user", content: "user" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://models.github.ai/inference/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ghu_test_token",
        }),
      }),
    );
  });
});
```

```ts
// src/__tests__/report-validator.test.ts
import { describe, expect, test } from "@jest/globals";
import { validateReportDraft } from "../report-validator.js";

describe("validateReportDraft", () => {
  test("throws when the canonical sections are missing", () => {
    expect(() =>
      validateReportDraft("**Subject: BI Team Monthly Report – May 2026**\n\nHi team"),
    ).toThrow('Missing required section heading "PROJECT HIGHLIGHTS".');
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- --runTestsByPath src/__tests__/github-models.test.ts src/__tests__/report-validator.test.ts`

Expected: FAIL because the provider and validator modules do not exist yet.

- [ ] **Step 3: Add prompt templates, the GitHub Models provider, prompt loading, validation, and an audited report generator**

```md
<!-- prompts/report-system.md -->
You are an assistant that creates concise, professional monthly update emails for senior leadership on behalf of the BI Team.

Return a leadership email body for {{monthName}} {{year}} with these exact sections and headings:

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

────────────────────────────────────────────────────────────
KEY WINS & METRICS

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES

Rules:
- Keep all three sections even when the notes are sparse.
- If a section has limited detail, write a single bullet that says "No significant updates captured in the meeting notes for this area."
- Write only the email body.
- Use clear executive language.
- End with:
  Best regards,
  BI Team
```

```md
<!-- prompts/report-user.md -->
Here are the BI Team meeting notes for {{monthName}} {{year}}.

Use this normalized note corpus as the only source material for the report:

{{notes}}
```

```ts
// src/prompt-loader.ts
import { readFile } from "node:fs/promises";
import path from "node:path";

const PROMPTS_DIRECTORY = new URL("../prompts/", import.meta.url);

export async function renderPromptTemplate(
  fileName: string,
  values: Record<string, string | number>,
): Promise<string> {
  const template = await readFile(new URL(fileName, PROMPTS_DIRECTORY), "utf8");
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}
```

```ts
// src/github-models.ts
import { ModelProvider, ModelRequest, ModelResponse } from "./types.js";

const INFERENCE_URL = "https://models.github.ai/inference/chat/completions";

export function createGitHubModelsProvider(
  token: string,
  fetchImpl: typeof fetch = fetch,
): ModelProvider {
  return {
    async generate(request: ModelRequest): Promise<ModelResponse> {
      const response = await fetchImpl(INFERENCE_URL, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub Models request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("GitHub Models returned an empty completion.");
      }

      return {
        content,
        usage: payload.usage ?? {},
        rawResponse: payload,
      };
    },
  };
}
```

```ts
// src/email-template.ts
import { ReportPeriod } from "./types.js";

const SECTION_DIVIDER = "─".repeat(60);

export function formatEmail(body: string, period: ReportPeriod): string {
  const subject = `**Subject: BI Team Monthly Report – ${period.monthName} ${period.year}**`;
  return [subject, "", SECTION_DIVIDER, "", body.trim(), ""].join("\n");
}
```

```ts
// src/__tests__/email-template.test.ts
import { describe, expect, test } from "@jest/globals";
import { formatEmail } from "../email-template.js";

describe("formatEmail", () => {
  test("wraps a generated body with the canonical subject line", () => {
    const result = formatEmail("PROJECT HIGHLIGHTS\n\nKEY WINS & METRICS\n\nUPCOMING PRIORITIES\n\nBest regards,\nBI Team", {
      year: 2026,
      month: 5,
      monthName: "May",
    });

    expect(result).toContain("**Subject: BI Team Monthly Report – May 2026**");
  });
});
```

```ts
// src/report-validator.ts
const REQUIRED_HEADINGS = [
  "PROJECT HIGHLIGHTS",
  "KEY WINS & METRICS",
  "UPCOMING PRIORITIES",
  "Best regards,",
] as const;

export function validateReportDraft(draft: string): void {
  for (const heading of REQUIRED_HEADINGS) {
    if (!draft.includes(heading)) {
      throw new Error(`Missing required section heading "${heading}".`);
    }
  }
}
```

```ts
// src/report-generator.ts
import { formatEmail } from "./email-template.js";
import { renderPromptTemplate } from "./prompt-loader.js";
import { validateReportDraft } from "./report-validator.js";
import { ModelProvider, OneNoteSourceBundle, ReportGenerationResult } from "./types.js";

export async function generateReport(
  bundle: OneNoteSourceBundle,
  provider: ModelProvider,
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<ReportGenerationResult> {
  const notes = bundle.pages
    .map((page) => `## ${page.title}\n\n${page.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = await renderPromptTemplate("report-system.md", bundle.period);
  const userPrompt = await renderPromptTemplate("report-user.md", {
    ...bundle.period,
    notes,
  });

  const response = await provider.generate({
    model,
    temperature,
    maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const draft = formatEmail(response.content, bundle.period);
  validateReportDraft(draft);

  return {
    draft,
    auditTrail: {
      generatedAt: new Date().toISOString(),
      model,
      prompts: {
        system: systemPrompt,
        user: userPrompt,
      },
      usage: response.usage,
      rawResponse: response.rawResponse,
    },
  };
}
```

```ts
// src/types.ts (provider and audit excerpt)
export interface ModelRequest {
  model: string;
  temperature: number;
  maxTokens: number;
  messages: Array<{ role: "system" | "user"; content: string }>;
}

export interface ModelResponse {
  content: string;
  usage: Record<string, number | undefined>;
  rawResponse: unknown;
}

export interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}

export interface ReportGenerationResult {
  draft: string;
  auditTrail: {
    generatedAt: string;
    model: string;
    prompts: {
      system: string;
      user: string;
    };
    usage: Record<string, number | undefined>;
    rawResponse: unknown;
  };
}
```

- [ ] **Step 4: Run the focused tests and update the existing report-generator and email-template tests**

Run: `npm test -- --runTestsByPath src/__tests__/github-models.test.ts src/__tests__/report-validator.test.ts src/__tests__/report-generator.test.ts src/__tests__/email-template.test.ts`

Expected: PASS with provider request mapping, validation, report-generator, and email-template tests green.

- [ ] **Step 5: Commit the generation layer**

```bash
git add prompts/report-system.md prompts/report-user.md src/prompt-loader.ts src/github-models.ts src/report-validator.ts src/report-generator.ts src/email-template.ts src/types.ts src/__tests__/github-models.test.ts src/__tests__/report-validator.test.ts src/__tests__/report-generator.test.ts
git commit -m "feat: add github models report generation"
```

### Task 4: Implement the end-to-end `run` command and timestamped artifact writing

**Files:**
- Create: `src/artifacts.ts`
- Create: `src/commands/run-report.ts`
- Create: `src/cli.ts`
- Test: `src/__tests__/run-report.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing orchestration test for a live report run**

```ts
// src/__tests__/run-report.test.ts
import { describe, expect, jest, test } from "@jest/globals";
import { runReportCommand } from "../commands/run-report.js";

describe("runReportCommand", () => {
  test("writes a report draft, source bundle, and audit trail to a timestamped directory", async () => {
    const deps = {
      loadAppConfig: jest.fn(async () => ({
        onenote: {
          tenantId: "tenant-id",
          clientId: "client-id",
          userId: "bi-team@yourorg.onmicrosoft.com",
          notebookName: "BI Team Notebook",
          sectionName: "Meeting Notes",
        },
        generation: {
          provider: "github_models",
          model: "openai/gpt-4.1",
          temperature: 0.2,
          maxTokens: 1200,
        },
        output: { rootDirectory: "reports/generated" },
        secrets: { githubToken: "ghu_test" },
      })),
      fetchBundleFromOneNote: jest.fn(async () => ({
        schemaVersion: 1,
        createdAt: "2026-05-27T12:00:00Z",
        period: { year: 2026, month: 5, monthName: "May" },
        source: {
          kind: "onenote",
          userId: "bi-team@yourorg.onmicrosoft.com",
          notebookName: "BI Team Notebook",
          sectionName: "Meeting Notes",
        },
        pages: [],
      })),
      generateReport: jest.fn(async () => ({
        draft: "**Subject: BI Team Monthly Report – May 2026**\n\nPROJECT HIGHLIGHTS\n\nKEY WINS & METRICS\n\nUPCOMING PRIORITIES\n\nBest regards,\nBI Team",
        auditTrail: { generatedAt: "2026-05-27T12:00:00Z", model: "openai/gpt-4.1", prompts: { system: "s", user: "u" }, usage: {}, rawResponse: {} },
      })),
      writeRunArtifacts: jest.fn(async () => ({
        directory: "reports/generated/2026-05/2026-05-27T12-00-00-000Z",
        reportPath: "reports/generated/2026-05/2026-05-27T12-00-00-000Z/report.md",
        sourceBundlePath: "reports/generated/2026-05/2026-05-27T12-00-00-000Z/source-bundle.json",
        auditTrailPath: "reports/generated/2026-05/2026-05-27T12-00-00-000Z/audit-trail.json",
      })),
    };

    const result = await runReportCommand(
      { command: "run", period: { year: 2026, month: 5, monthName: "May" } },
      deps as never,
    );

    expect(result.directory).toContain("reports/generated/2026-05/");
    expect(deps.writeRunArtifacts).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the orchestration test to verify it fails**

Run: `npm test -- --runTestsByPath src/__tests__/run-report.test.ts`

Expected: FAIL because `../commands/run-report.js` does not exist yet.

- [ ] **Step 3: Implement artifact writing, command orchestration, the CLI entrypoint, and generated-output ignoring**

```ts
// src/artifacts.ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { OneNoteSourceBundle, ReportGenerationResult, ReportPeriod, RepoConfigFile } from "./types.js";

export async function writeRunArtifacts(
  output: RepoConfigFile["output"],
  period: ReportPeriod,
  bundle: OneNoteSourceBundle,
  generation: ReportGenerationResult,
) {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const periodDirectory = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const directory = path.join(output.rootDirectory, periodDirectory, runId);
  await mkdir(directory, { recursive: true });

  const reportPath = path.join(directory, "report.md");
  const sourceBundlePath = path.join(directory, "source-bundle.json");
  const auditTrailPath = path.join(directory, "audit-trail.json");

  await writeFile(reportPath, generation.draft, "utf8");
  await writeFile(sourceBundlePath, JSON.stringify(bundle, null, 2), "utf8");
  await writeFile(auditTrailPath, JSON.stringify(generation.auditTrail, null, 2), "utf8");

  return { directory, reportPath, sourceBundlePath, auditTrailPath };
}
```

```ts
// src/commands/run-report.ts
import { loadAppConfig } from "../app-config.js";
import { writeRunArtifacts } from "../artifacts.js";
import { createGitHubModelsProvider } from "../github-models.js";
import { createPublicClient, getGraphAccessToken } from "../onenote-auth.js";
import { fetchOneNotePages } from "../onenote.js";
import { generateReport } from "../report-generator.js";
import { buildSourceBundle } from "../source-bundle.js";
import { CliCommand } from "../types.js";

async function fetchBundleFromOneNote(config: Awaited<ReturnType<typeof loadAppConfig>>, period: Extract<CliCommand, { command: "run" }>["period"]) {
  const publicClient = await createPublicClient(
    config.onenote.tenantId,
    config.onenote.clientId,
  );
  const graphToken = await getGraphAccessToken(publicClient, config.onenote.userId);
  const pages = await fetchOneNotePages(config.onenote, graphToken, period);

  if (pages.length === 0) {
    throw new Error(`No meeting notes found for ${period.monthName} ${period.year}.`);
  }

  return buildSourceBundle(config.onenote, period, pages);
}

export async function runReportCommand(
  command: Extract<CliCommand, { command: "run" }>,
  deps = {
    loadAppConfig,
    fetchBundleFromOneNote,
    generateReport,
    writeRunArtifacts,
    createGitHubModelsProvider,
  },
) {
  const config = await deps.loadAppConfig();
  const bundle = await deps.fetchBundleFromOneNote(config, command.period);
  const provider = deps.createGitHubModelsProvider(config.secrets.githubToken);
  const generation = await deps.generateReport(
    bundle,
    provider,
    command.modelOverride ?? config.generation.model,
    config.generation.temperature,
    config.generation.maxTokens,
  );

  return deps.writeRunArtifacts(config.output, command.period, bundle, generation);
}
```

```ts
// src/cli.ts
import { parseCliArgs } from "./cli/parse-args.js";
import { runReportCommand } from "./commands/run-report.js";

const command = parseCliArgs(process.argv.slice(2));

if (command.command !== "run") {
  throw new Error("Rerender is not available in this build.");
}

const result = await runReportCommand(command);

console.log(`Report draft written to ${result.reportPath}`);
console.log(`Source bundle written to ${result.sourceBundlePath}`);
console.log(`Audit trail written to ${result.auditTrailPath}`);
```

```gitignore
# .gitignore
node_modules/
dist/
.env
*.js.map
coverage/
reports/generated/
```

- [ ] **Step 4: Run the focused orchestration test and a build**

Run: `npm test -- --runTestsByPath src/__tests__/run-report.test.ts`

Expected: PASS with the run-command orchestration test green.

Run: `npm run build`

Expected: PASS with `tsc` exiting cleanly and `dist/cli.js` emitted.

- [ ] **Step 5: Commit the run-command flow**

```bash
git add src/artifacts.ts src/commands/run-report.ts src/cli.ts src/__tests__/run-report.test.ts .gitignore
git commit -m "feat: add local report run command"
```

### Task 5: Implement bundle-based rerendering as a first-class command

**Files:**
- Create: `src/commands/rerender-report.ts`
- Test: `src/__tests__/rerender-report.test.ts`
- Modify: `src/cli/parse-args.ts`
- Modify: `src/cli.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write the failing test for rerendering from an existing source bundle**

```ts
// src/__tests__/rerender-report.test.ts
import { describe, expect, jest, test } from "@jest/globals";
import { rerenderReportCommand } from "../commands/rerender-report.js";

describe("rerenderReportCommand", () => {
  test("loads a source bundle and regenerates a report without refetching OneNote", async () => {
    const deps = {
      loadAppConfig: jest.fn(async () => ({
        generation: {
          provider: "github_models",
          model: "openai/gpt-4.1",
          temperature: 0.2,
          maxTokens: 1200,
        },
        output: { rootDirectory: "reports/generated" },
        secrets: { githubToken: "ghu_test" },
      })),
      loadSourceBundle: jest.fn(async () => ({
        schemaVersion: 1,
        createdAt: "2026-05-27T12:00:00Z",
        period: { year: 2026, month: 5, monthName: "May" },
        source: {
          kind: "onenote",
          userId: "bi-team@yourorg.onmicrosoft.com",
          notebookName: "BI Team Notebook",
          sectionName: "Meeting Notes",
        },
        pages: [],
      })),
      generateReport: jest.fn(async () => ({
        draft: "**Subject: BI Team Monthly Report – May 2026**\n\nPROJECT HIGHLIGHTS\n\nKEY WINS & METRICS\n\nUPCOMING PRIORITIES\n\nBest regards,\nBI Team",
        auditTrail: { generatedAt: "2026-05-27T12:05:00Z", model: "openai/gpt-4.1", prompts: { system: "s", user: "u" }, usage: {}, rawResponse: {} },
      })),
      writeRunArtifacts: jest.fn(async () => ({
        directory: "reports/generated/2026-05/2026-05-27T12-05-00-000Z",
        reportPath: "reports/generated/2026-05/2026-05-27T12-05-00-000Z/report.md",
        sourceBundlePath: "reports/generated/2026-05/2026-05-27T12-05-00-000Z/source-bundle.json",
        auditTrailPath: "reports/generated/2026-05/2026-05-27T12-05-00-000Z/audit-trail.json",
      })),
    };

    const result = await rerenderReportCommand(
      { command: "rerender", bundlePath: "reports/generated/2026-05/source-bundle.json" },
      deps as never,
    );

    expect(deps.loadSourceBundle).toHaveBeenCalledWith(
      "reports/generated/2026-05/source-bundle.json",
    );
    expect(result.auditTrailPath).toContain("audit-trail.json");
  });
});
```

- [ ] **Step 2: Run the rerender test to verify it fails**

Run: `npm test -- --runTestsByPath src/__tests__/rerender-report.test.ts`

Expected: FAIL because `../commands/rerender-report.js` does not exist yet.

- [ ] **Step 3: Implement the rerender command and keep the output contract identical to `run`**

```ts
// src/commands/rerender-report.ts
import { loadAppConfig } from "../app-config.js";
import { writeRunArtifacts } from "../artifacts.js";
import { createGitHubModelsProvider } from "../github-models.js";
import { generateReport } from "../report-generator.js";
import { loadSourceBundle } from "../source-bundle.js";
import { CliCommand } from "../types.js";

export async function rerenderReportCommand(
  command: Extract<CliCommand, { command: "rerender" }>,
  deps = {
    loadAppConfig,
    loadSourceBundle,
    generateReport,
    writeRunArtifacts,
    createGitHubModelsProvider,
  },
) {
  const config = await deps.loadAppConfig();
  const bundle = await deps.loadSourceBundle(command.bundlePath);
  const provider = deps.createGitHubModelsProvider(config.secrets.githubToken);
  const generation = await deps.generateReport(
    bundle,
    provider,
    command.modelOverride ?? config.generation.model,
    config.generation.temperature,
    config.generation.maxTokens,
  );

  return deps.writeRunArtifacts(config.output, bundle.period, bundle, generation);
}
```

```ts
// src/cli.ts
import { parseCliArgs } from "./cli/parse-args.js";
import { rerenderReportCommand } from "./commands/rerender-report.js";
import { runReportCommand } from "./commands/run-report.js";

const command = parseCliArgs(process.argv.slice(2));

const result =
  command.command === "run"
    ? await runReportCommand(command)
    : await rerenderReportCommand(command);

console.log(`Report draft written to ${result.reportPath}`);
console.log(`Source bundle written to ${result.sourceBundlePath}`);
console.log(`Audit trail written to ${result.auditTrailPath}`);
```

- [ ] **Step 4: Run the rerender test and a command-level smoke run**

Run: `npm test -- --runTestsByPath src/__tests__/rerender-report.test.ts`

Expected: PASS with the rerender test green.

Run: `npm run rerender -- --bundle reports/generated/2026-05/example/source-bundle.json`

Expected: When pointed at a real source bundle, prints the three artifact paths and does not contact OneNote.

- [ ] **Step 5: Commit bundle rerendering**

```bash
git add src/commands/rerender-report.ts src/__tests__/rerender-report.test.ts src/cli/parse-args.ts src/types.ts
git commit -m "feat: add report rerender command"
```

### Task 6: Remove the Copilot Extension surface and refresh docs for the local CLI

**Files:**
- Test: `src/__tests__/cli-help.test.ts`
- Delete: `src/index.ts`
- Delete: `src/agent.ts`
- Delete: `src/period-parser.ts`
- Delete: `src/__tests__/period-parser.test.ts`
- Delete: `src/__mocks__/copilot-sdk.ts`
- Modify: `package.json`
- Modify: `jest.config.json`
- Modify: `README.md`
- Modify: `src/cli.ts`

- [ ] **Step 1: Write the failing CLI help test so the public surface is explicit**

```ts
// src/__tests__/cli-help.test.ts
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
```

- [ ] **Step 2: Run the help test to verify it fails**

Run: `npm test -- --runTestsByPath src/__tests__/cli-help.test.ts`

Expected: FAIL because `renderHelpText` is not exported yet.

- [ ] **Step 3: Implement CLI help, remove the extension-only files and dependencies, and rewrite the docs**

```ts
// src/cli/parse-args.ts (help excerpt)
export function renderHelpText(): string {
  return [
    "monthly-reports run [--period YYYY-MM] [--model MODEL_ID]",
    "monthly-reports rerender --bundle <path> [--model MODEL_ID]",
    "",
    "run       Fetch OneNote notes, generate a report draft, and write artifacts.",
    "rerender  Reuse an existing source bundle and generate a new report draft.",
  ].join("\n");
}
```

```ts
// src/cli.ts
import { parseCliArgs, renderHelpText } from "./cli/parse-args.js";
import { rerenderReportCommand } from "./commands/rerender-report.js";
import { runReportCommand } from "./commands/run-report.js";

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  console.log(renderHelpText());
  process.exit(0);
}

const command = parseCliArgs(argv);
const result =
  command.command === "run"
    ? await runReportCommand(command)
    : await rerenderReportCommand(command);

console.log(`Report draft written to ${result.reportPath}`);
console.log(`Source bundle written to ${result.sourceBundlePath}`);
console.log(`Audit trail written to ${result.auditTrailPath}`);
```

```json
// package.json (dependency excerpt)
{
  "dependencies": {
    "@azure/msal-node": "^5.2.2",
    "@azure/msal-node-extensions": "^1.3.0",
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "node-html-markdown": "^2.0.0"
  },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "@types/node": "^22.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.4.11",
    "ts-node": "^10.9.2",
    "typescript": "^5.0.0"
  }
}
```

```json
// jest.config.json
{
  "extensionsToTreatAsEsm": [".ts"],
  "transform": {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        "useESM": true,
        "tsconfig": {
          "module": "NodeNext",
          "moduleResolution": "NodeNext"
        }
      }
    ]
  },
  "testEnvironment": "node",
  "roots": ["<rootDir>/src"],
  "testMatch": ["**/__tests__/**/*.test.ts"],
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/cli.ts"
  ]
}
```

```md
<!-- README.md (usage excerpt) -->
# BI Monthly Reporting CLI

Generate BI Team leadership report drafts from OneNote on your local machine.

## Commands

```bash
npm run build
npm run report -- --period 2026-05
npm run rerender -- --bundle reports/generated/2026-05/2026-05-27T12-00-00-000Z/source-bundle.json
```

## Artifacts

Each run writes:

- `report.md`
- `source-bundle.json`
- `audit-trail.json`
```

- [ ] **Step 4: Remove the obsolete dependencies, run the full suite, and build the CLI**

Run: `npm uninstall @copilot-extensions/preview-sdk express express-rate-limit @types/express`

Expected: `package-lock.json` updates and the removed packages disappear from `package.json`.

Run: `npm test`

Expected: PASS with the CLI, auth, bundle, generation, and command tests all green.

Run: `npm run build`

Expected: PASS with a clean TypeScript build and no references to `src/index.ts` or `src/agent.ts`.

- [ ] **Step 5: Commit the cleanup and documentation refresh**

```bash
git add package.json package-lock.json jest.config.json README.md .env.example src/cli/parse-args.ts src/__tests__/cli-help.test.ts
git rm src/index.ts src/agent.ts src/period-parser.ts src/__tests__/period-parser.test.ts src/__mocks__/copilot-sdk.ts
git commit -m "refactor: replace copilot extension entrypoints with local cli"
```

## Self-Review

- **Spec coverage:** The plan covers the local CLI surface (`run`, `rerender`), OneNote-only v1 source handling, delegated auth with cached tokens, GitHub Models provider abstraction, checked-in prompt templates, a single canonical report format with hard validation, timestamped git-ignored run artifacts, full audit trail capture, and rerender-from-bundle support.
- **Placeholder scan:** There are no `TODO`, `TBD`, or “implement later” markers. Each task names exact files, concrete commands, and representative code to add.
- **Type consistency:** The same shared names are used throughout the plan: `AppConfig`, `CliCommand`, `OneNoteSourceBundle`, `ModelProvider`, `ReportGenerationResult`, `runReportCommand`, and `rerenderReportCommand`. The command set stays fixed as `run` and `rerender` from Task 1 through Task 6.
