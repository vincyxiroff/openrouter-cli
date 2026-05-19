import type { AppConfig } from "./types.js";

export type AutoApprovalOptions = {
  yes?: boolean;
  autoEdits?: boolean;
  autoCmds?: boolean;
};

export type AutoApproval = {
  edits: boolean;
  commands: boolean;
};

export function resolveAutoApproval(
  config: AppConfig,
  options: AutoApprovalOptions = {}
): AutoApproval {
  const yes = options.yes === true;

  return {
    edits: yes || options.autoEdits === true || config.autoAcceptEdits,
    commands: yes || options.autoCmds === true || config.autoAcceptCommands
  };
}
