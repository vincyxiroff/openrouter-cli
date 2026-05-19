import { select } from "@inquirer/prompts";
import { TrustManager } from "../trust/manager/trustManager.js";
import { formatPath, renderTrustState } from "../trust/ui/trustUi.js";
import { printInfo, printMuted } from "../terminal/render.js";

export type TrustCommandOptions = {
  action?: string;
};

export async function trustCommand(action?: string, cwd = process.cwd()): Promise<void> {
  const manager = new TrustManager();
  const selected = action ?? (await chooseTrustAction());

  if (selected === "project") {
    renderTrustState(await manager.trustProject(cwd));
    return;
  }

  if (selected === "folder") {
    renderTrustState(await manager.trustFolder(cwd));
    return;
  }

  if (selected === "remove") {
    renderTrustState(await manager.remove(cwd));
    return;
  }

  if (selected === "reset") {
    await manager.reset();
    printInfo("Trust database reset.");
    return;
  }

  if (selected === "list") {
    await listTrust(manager);
    return;
  }

  renderTrustState(await manager.state(cwd));
}

export async function trustListCommand(): Promise<void> {
  await listTrust(new TrustManager());
}

export async function trustRemoveCommand(cwd = process.cwd()): Promise<void> {
  renderTrustState(await new TrustManager().remove(cwd));
}

export async function trustResetCommand(): Promise<void> {
  await new TrustManager().reset();
  printInfo("Trust database reset.");
}

async function chooseTrustAction(): Promise<string> {
  return select({
    message: "Trust manager",
    choices: [
      { name: "Status", value: "status" },
      { name: "Trust current project", value: "project" },
      { name: "Trust parent folder", value: "folder" },
      { name: "Remove current trust", value: "remove" },
      { name: "List trusted paths", value: "list" },
      { name: "Reset all trust", value: "reset" }
    ]
  });
}

async function listTrust(manager: TrustManager): Promise<void> {
  const database = await manager.list();
  printInfo("Trusted Projects");

  if (database.trustedProjects.length === 0) {
    printMuted("No trusted projects.");
  } else {
    for (const path of database.trustedProjects) {
      printMuted(formatPath(path));
    }
  }

  console.log("");
  printInfo("Trusted Folders");

  if (database.trustedFolders.length === 0) {
    printMuted("No trusted folders.");
  } else {
    for (const path of database.trustedFolders) {
      printMuted(formatPath(path));
    }
  }
}
