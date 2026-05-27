import { readFile } from "node:fs/promises";

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
