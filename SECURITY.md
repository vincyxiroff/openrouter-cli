# Security

Report vulnerabilities privately through GitHub Security Advisories.

openrouter-cli is designed to avoid automatic destructive behavior:

- Shell commands require confirmation.
- High-risk shell patterns are blocked.
- Sensitive files such as `.env`, private keys, credentials, secrets, and token files are refused.
- OpenRouter API keys are read from the environment and never written to project files.
