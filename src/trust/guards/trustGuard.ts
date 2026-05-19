import type { AppConfig } from "../../core/types.js";
import { UserFacingError } from "../../utils/errors.js";
import { TrustManager } from "../manager/trustManager.js";
import type { TrustState } from "../types/trust.js";

export class TrustGuard {
  constructor(private readonly manager = new TrustManager()) {}

  async state(cwd = process.cwd()): Promise<TrustState> {
    return this.manager.state(cwd);
  }

  async ensureTrusted(
    cwd: string,
    action: "editing" | "command execution" | "plugins" | "MCP"
  ): Promise<void> {
    const state = await this.manager.state(cwd);

    if (state.level === "restricted") {
      throw new UserFacingError(`Project is not trusted. Run /trust to enable ${action}.`);
    }
  }

  async applyConfigRestrictions(cwd: string, config: AppConfig): Promise<AppConfig> {
    const state = await this.manager.state(cwd);

    if (state.level !== "restricted") {
      return config;
    }

    return {
      ...config,
      allowCommandExecution: false,
      autoAcceptEdits: false,
      autoAcceptCommands: false
    };
  }
}
