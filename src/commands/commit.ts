import { OpenRouterClient } from "../ai/openrouter.js";
import { loadConfig, readApiKey } from "../config/loadConfig.js";
import { gitDiff, gitStatus } from "../git/git.js";
import { UserFacingError } from "../utils/errors.js";

export async function commitCommand(cwd = process.cwd()): Promise<void> {
  const apiKey = readApiKey();

  if (!apiKey) {
    throw new UserFacingError("Missing OPENROUTER_API_KEY");
  }

  const config = await loadConfig(cwd);
  const status = await gitStatus(cwd);
  const diff = await gitDiff(cwd);

  if (!status && !diff) {
    throw new UserFacingError("No git changes found or git is unavailable");
  }

  const answer = await new OpenRouterClient().chat({
    apiKey,
    model: config.model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: "Generate one conventional commit message. Return only the commit message."
      },
      { role: "user", content: `Status:\n${status}\n\nDiff:\n${diff.slice(0, 40_000)}` }
    ],
    onToken: (token) => process.stdout.write(token)
  });

  if (!answer.endsWith("\n")) {
    process.stdout.write("\n");
  }
}
