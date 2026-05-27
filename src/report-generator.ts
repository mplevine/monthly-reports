import { formatEmail } from "./email-template.js";
import { renderPromptTemplate } from "./prompt-loader.js";
import { validateReportDraft } from "./report-validator.js";
import {
  ModelProvider,
  OneNoteSourceBundle,
  ReportGenerationResult,
} from "./types.js";

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

  const systemPrompt = await renderPromptTemplate("report-system.md", {
    ...bundle.period,
  });
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
