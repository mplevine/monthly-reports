import { loadAppConfig } from "../app-config.js";
import { writeRunArtifacts } from "../artifacts.js";
import { createGitHubModelsProvider } from "../github-models.js";
import { generateReport } from "../report-generator.js";
import { loadSourceBundle } from "../source-bundle.js";
import { CliCommand, ModelProvider, RunArtifacts } from "../types.js";

type RerenderCommand = Extract<CliCommand, { command: "rerender" }>;

interface RerenderReportCommandDependencies {
  loadAppConfig: typeof loadAppConfig;
  loadSourceBundle: typeof loadSourceBundle;
  generateReport: typeof generateReport;
  writeRunArtifacts: typeof writeRunArtifacts;
  createGitHubModelsProvider: (token: string) => ModelProvider;
}

export async function rerenderReportCommand(
  command: RerenderCommand,
  deps: Partial<RerenderReportCommandDependencies> = {},
): Promise<RunArtifacts> {
  const resolvedDeps: RerenderReportCommandDependencies = {
    loadAppConfig,
    loadSourceBundle,
    generateReport,
    writeRunArtifacts,
    createGitHubModelsProvider,
    ...deps,
  };

  const config = await resolvedDeps.loadAppConfig();
  const bundle = await resolvedDeps.loadSourceBundle(command.bundlePath);
  const provider = resolvedDeps.createGitHubModelsProvider(config.secrets.githubToken);
  const generation = await resolvedDeps.generateReport(
    bundle,
    provider,
    command.modelOverride ?? config.generation.model,
    config.generation.temperature,
    config.generation.maxTokens,
  );

  return resolvedDeps.writeRunArtifacts(config.output, bundle.period, bundle, generation);
}
