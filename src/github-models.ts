import { ModelProvider, ModelRequest, ModelResponse } from "./types.js";

const INFERENCE_URL = "https://models.github.ai/inference/chat/completions";

export function createGitHubModelsProvider(
  token: string,
  fetchImpl: typeof fetch = fetch,
): ModelProvider {
  return {
    id: "github_models",
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
