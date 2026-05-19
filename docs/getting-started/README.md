# Getting Started

`openrouter-cli` is designed to be useful immediately after installation.

## Install

```bash
npm install -g openrouter-cli-v2
```

## First Run

```bash
orc
```

If no project config exists, the CLI starts the setup UI:

1. Ask for the OpenRouter API key using a hidden password prompt.
2. Save the key in `.env`.
3. Ensure `.env` is ignored by git.
4. Verify the key against OpenRouter.
5. Download the live model catalog.
6. Ask for the default model and basic configuration.
7. Create `.openrouter-cli/project-config.json`.
8. Create `.openrouter-cli/history.json`.
9. Use the OS app-data directory for global caches such as `models-cache.json`.
10. Ask whether to trust the current project.

After setup, `orc` opens the interactive chat. Type `/` for commands and `@` for file mentions.

## Common Commands

```bash
orc ask "explain this project"
orc ask "explain @src/index.ts"
orc edit "fix TypeScript errors"
orc edit "fix tests" --yes
orc models --free
orc context "authentication"
orc doctor
orc trust status
```

## Manual Setup

```bash
orc setup
orc setup --reset
orc setup --model
orc setup --key
```
