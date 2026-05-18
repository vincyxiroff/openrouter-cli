# Getting Started

`openrouter-cli` is designed to be useful immediately after installation.

## Install

```bash
npm install -g openrouter-cli
```

## First Run

```bash
orc
```

If `.openrouter-cli.json` does not exist, the CLI starts the setup UI:

1. Ask for the OpenRouter API key using a hidden password prompt.
2. Save the key in `.env`.
3. Ensure `.env` is ignored by git.
4. Verify the key against OpenRouter.
5. Download the live model catalog.
6. Ask for the default model and basic configuration.
7. Create `.openrouter-cli.json`.
8. Create `.openrouter-cli/history.json` and `.openrouter-cli/models-cache.json`.

## Common Commands

```bash
orc ask "explain this project"
orc edit "fix TypeScript errors"
orc models --free
orc context "authentication"
orc doctor
```

## Manual Setup

```bash
orc setup
orc setup --reset
orc setup --model
orc setup --key
```
