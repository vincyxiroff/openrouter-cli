import { OpenRouterClient } from "../ai/openrouter.js";
import { loadConfig, readApiKey } from "../config/loadConfig.js";
import { validateCommand } from "../safety/commands.js";
import { theme } from "../terminal/theme.js";

export async function doctorCommand(cwd = process.cwd()): Promise<void> {
  const config = await loadConfig(cwd);
  const apiKey = readApiKey();
  const checks: Array<[string, boolean, string]> = [];
  checks.push(["Config", true, config.model]);
  checks.push(["API key", Boolean(apiKey), apiKey ? "present" : "missing OPENROUTER_API_KEY"]);
  checks.push(["Safety policy", !validateCommand("rm -rf /").ok, "dangerous commands blocked"]);

  if (apiKey) {
    try {
      await new OpenRouterClient().listModels(apiKey);
      checks.push(["OpenRouter", true, "reachable"]);
    } catch (error) {
      checks.push(["OpenRouter", false, error instanceof Error ? error.message : String(error)]);
    }
  }

  for (const [name, ok, detail] of checks) {
    const mark = ok ? theme.success("✓") : theme.danger("✗");
    console.log(`${mark} ${name}: ${detail}`);
  }
}
