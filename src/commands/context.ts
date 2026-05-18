import { loadConfig } from "../config/loadConfig.js";
import { formatContextList } from "../context/describeContext.js";
import { buildContext } from "../context/fileScanner.js";

export async function contextCommand(
  query = "project overview",
  cwd = process.cwd()
): Promise<void> {
  const config = await loadConfig(cwd);
  const files = await buildContext(cwd, config, query);
  console.log(formatContextList(files));
}
