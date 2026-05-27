import { loadAppConfig } from "../app-config.js";
import { writeRunArtifacts } from "../artifacts.js";
import { createGitHubModelsProvider } from "../github-models.js";
import { createPublicClient, getGraphAccessToken } from "../onenote-auth.js";
import { fetchOneNotePages } from "../onenote.js";
import { generateReport } from "../report-generator.js";
import { buildSourceBundle } from "../source-bundle.js";
import { AppConfig, CliCommand, ModelProvider } from "../types.js";

type RunCommand = Extract<CliCommand, { command: "run" }>;

interface RunReportCommandDependencies {
  loadAppConfig: typeof loadAppConfig;
  fetchBundleFromOneNote: (
    config: AppConfig,
    period: RunCommand["period"],
  ) => ReturnType<typeof buildSourceBundle> | Promise<ReturnType<typeof buildSourceBundle>>;
  generateReport: typeof generateReport;
  writeRunArtifacts: typeof writeRunArtifacts;
  createGitHubModelsProvider: (token: string) => ModelProvider;
}

async function fetchBundleFromOneNote(
  config: Awaited<ReturnType<typeof loadAppConfig>>,
  period: RunCommand["period"],
) {
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
  command: RunCommand,
  deps: Partial<RunReportCommandDependencies> = {},
) {
  const resolvedDeps: RunReportCommandDependencies = {
    loadAppConfig,
    fetchBundleFromOneNote,
    generateReport,
    writeRunArtifacts,
    createGitHubModelsProvider,
    ...deps,
  };

  const config = await resolvedDeps.loadAppConfig();
  const bundle = await resolvedDeps.fetchBundleFromOneNote(config, command.period);
  const provider = resolvedDeps.createGitHubModelsProvider(config.secrets.githubToken);
  const generation = await resolvedDeps.generateReport(
    bundle,
    provider,
    command.modelOverride ?? config.generation.model,
    config.generation.temperature,
    config.generation.maxTokens,
  );

  return resolvedDeps.writeRunArtifacts(config.output, command.period, bundle, generation);
}
