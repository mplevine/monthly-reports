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

    const provider = createGitHubModelsProvider(
      "ghu_test_token",
      fetchMock as typeof fetch,
    );

    await provider.generate({
      model: "openai/gpt-4.1",
      temperature: 0.2,
      maxTokens: 1200,
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
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
