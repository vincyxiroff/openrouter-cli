import ora from "ora";
import { OpenRouterClient } from "../ai/openrouter.js";
import { contextPrompt, systemPrompt } from "../ai/prompts.js";
import { loadConfig, readApiKey } from "../config/loadConfig.js";
import { buildContext } from "../context/fileScanner.js";
import { appendHistory, readHistory } from "../memory/sessionMemory.js";
import { renderMarkdown } from "../terminal/render.js";
import { UserFacingError } from "../utils/errors.js";

export async function askCommand(prompt: string, cwd = process.cwd()): Promise<void> {
  const config = await loadConfig(cwd);
  const apiKey = readApiKey();

  if (!apiKey) {
    throw new UserFacingError("Missing OPENROUTER_API_KEY");
  }

  const spinner = ora("Building context").start();
  const files = await buildContext(cwd, config, prompt);
  const history = await readHistory(cwd);
  spinner.text = "Streaming response";

  const client = new OpenRouterClient();
  let printed = false;
  const answer = await client.chat({
    apiKey,
    model: config.model,
    temperature: config.temperature,
    messages: [
      { role: "system", content: systemPrompt() },
      ...history,
      { role: "user", content: `Context:\n${contextPrompt(files)}\n\nQuestion:\n${prompt}` }
    ],
    onToken(token) {
      if (!printed) {
        spinner.stop();
        printed = true;
      }

      process.stdout.write(token);
    }
  });

  if (!printed) {
    spinner.stop();
    console.log(renderMarkdown(answer));
  } else {
    process.stdout.write("\n");
  }

  await appendHistory(cwd, [
    { role: "user", content: prompt },
    { role: "assistant", content: answer }
  ]);
}
