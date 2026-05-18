# Configuration

The main configuration file is `.openrouter-cli.json`.

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-sonnet-4",
  "temperature": 0.2,
  "maxContextFiles": 40,
  "maxFileSizeKB": 100,
  "allowCommandExecution": false,
  "ignoredPaths": [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".turbo",
    ".cache",
    ".env",
    "*.lock"
  ]
}
```

## API Key

The OpenRouter API key is stored only in `.env`.

```bash
OPENROUTER_API_KEY=...
```

The setup flow updates only `OPENROUTER_API_KEY` and preserves other `.env` values.

## Local State

`openrouter-cli` stores local runtime state in `.openrouter-cli/`.

```text
.openrouter-cli/
├── history.json
├── models-cache.json
├── plugins.json
├── mcp.json
└── plugins/
```

These files are project-local and can be managed per repository.
