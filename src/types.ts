/**
 * Shared TypeScript interfaces for the BI Monthly Report Agent.
 */

/** A single meeting note page fetched from OneNote. */
export interface OneNotePage {
  id: string;
  title: string;
  /** Markdown-converted content of the OneNote page */
  content: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

/** Configuration for querying OneNote. */
export interface OneNoteConfig {
  /** Display name of the OneNote notebook (e.g. "BI Team Notebook") */
  notebookName: string;
  /** Name of the section inside the notebook (e.g. "Meeting Notes") */
  sectionName: string;
  /** Azure AD tenant ID */
  tenantId: string;
  /** Azure AD application (client) ID */
  clientId: string;
  /** UPN/email address of the user whose OneNote is being accessed */
  userId: string;
}

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

export interface RepoConfigFile {
  onenote: {
    tenantId: string;
    clientId: string;
    /** UPN/email address used for delegated OneNote auth */
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

/** Month and year parsed from a user's Copilot chat message. */
export interface ReportPeriod {
  /** Full month name, e.g. "January" */
  monthName: string;
  /** Numeric month, 1–12 */
  month: number;
  /** Four-digit year */
  year: number;
}

/** A Copilot chat message payload. */
export interface CopilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Project section in the generated email. */
export interface ProjectSection {
  name: string;
  updates: string[];
}

/** Structured data for filling the email template. */
export interface ReportEmailData {
  period: ReportPeriod;
  projects: ProjectSection[];
  keyWins: string[];
  upcomingPriorities: string[];
  /** Optional raw AI-generated email body (used when structured parsing is unavailable) */
  rawBody?: string;
}

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
  id: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

export interface ReportGenerationResult {
  draft: string;
  auditTrail: {
    generatedAt: string;
    model: string;
    generation: {
      provider: string;
      temperature: number;
      maxTokens: number;
    };
    prompts: {
      system: string;
      user: string;
    };
    usage: Record<string, number | undefined>;
    rawResponse: unknown;
  };
}

export type CliCommand =
  | { command: "run"; period: ReportPeriod; modelOverride?: string }
  | { command: "rerender"; bundlePath: string; modelOverride?: string };
