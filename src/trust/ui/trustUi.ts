import { select } from "@inquirer/prompts";
import boxen from "boxen";
import { relative } from "node:path";
import { homedir } from "node:os";
import { header, printInfo, printMuted } from "../../terminal/render.js";
import { theme } from "../../terminal/theme.js";
import { getVersionStatus } from "../../update/autoUpdate.js";
import { TrustManager } from "../manager/trustManager.js";
import type { TrustChoice, TrustLevel, TrustState } from "../types/trust.js";

export function trustBadge(level: TrustLevel): string {
  if (level === "trusted-project") {
    return theme.success("TRUSTED PROJECT");
  }

  if (level === "trusted-folder") {
    return theme.success("TRUSTED FOLDER");
  }

  return theme.warning("RESTRICTED");
}

export function formatPath(path: string): string {
  const home = homedir().replaceAll("\\", "/");
  const normalized = path.replaceAll("\\", "/");
  return normalized.startsWith(home)
    ? `~/${relative(home, normalized).replaceAll("\\", "/")}`
    : normalized;
}

export async function promptForTrust(cwd: string): Promise<TrustChoice> {
  const manager = new TrustManager();
  const state = await manager.state(cwd);
  console.log(header(await getVersionStatus(cwd)));
  console.log(
    boxen(
      [
        theme.title("Do you trust this project?"),
        "",
        `${theme.muted("Path:")}\n${formatPath(state.projectRoot)}`,
        "",
        "Trust level determines file access, command execution and automation."
      ].join("\n"),
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "#7c5cff"
      }
    )
  );

  return select({
    message: "Options",
    choices: [
      {
        name: "Trust Project - Trust only this repository/project",
        value: "project" as const
      },
      {
        name: "Trust Folder - Trust parent folder and all subprojects",
        value: "folder" as const
      },
      {
        name: "Continue Restricted - Safe read-only mode",
        value: "restricted" as const
      },
      {
        name: "Cancel - Exit CLI",
        value: "cancel" as const
      }
    ]
  });
}

export function renderTrustState(state: TrustState): void {
  printInfo("Current Trust");
  console.log(`Level: ${trustBadge(state.level)}`);
  printMuted(`Path: ${formatPath(state.trustedPath ?? state.projectRoot)}`);

  if (state.level === "restricted") {
    console.log("");
    console.log(
      boxen("Plugins, MCP, edits, commands and automation are disabled for untrusted projects.", {
        title: "Restricted Mode",
        padding: 1,
        borderStyle: "round",
        borderColor: "#f5a623"
      })
    );
  }
}
