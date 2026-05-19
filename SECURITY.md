# Security

Report vulnerabilities privately through GitHub Security Advisories.

openrouter-cli is designed to avoid automatic destructive behavior:

- Shell commands require confirmation.
- Auto command mode is available only in trusted workspaces.
- High-risk shell patterns are blocked.
- Sensitive files such as `.env`, private keys, credentials, secrets, and token files are refused.
- Unknown workspaces run in restricted mode.
- Plugins and MCP execution are disabled in restricted workspaces.
- OpenRouter API keys are read from `.env` and never written to project config.
