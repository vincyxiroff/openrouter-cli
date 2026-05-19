# Configuration

Project configuration lives in `.openrouter-cli/project-config.json`.

Legacy `.openrouter-cli.json` files are still read and migrated into the project data directory.

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-sonnet-4",
  "temperature": 0.2,
  "maxContextFiles": 40,
  "maxFileSizeKB": 100,
  "allowCommandExecution": false,
  "autoAcceptEdits": false,
  "autoAcceptCommands": false,
  "maxToolIterations": 20,
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

The OpenRouter API key is read from the current process environment, then from the project `.env`, then from global app-data storage.

```bash
OPENROUTER_API_KEY=...
```

The setup flow stores the key globally in `auth.json` so new folders can reuse it. A project `.env` can still override the global key. Global auth metadata is also written for future keychain support.

## Global App Data

Global state is stored outside the project:

```text
Windows: %APPDATA%\openrouter-cli\
Linux:   $XDG_CONFIG_HOME/openrouter-cli\ or ~/.config/openrouter-cli/
macOS:   ~/Library/Application Support/openrouter-cli/
```

```text
openrouter-cli/
├── trusted.json
├── global-config.json
├── models-cache.json
├── auth.json
├── auth-metadata.json
├── plugins/
├── logs/
└── cache/
```

## Local State

Project-local runtime state stays in `.openrouter-cli/`.

```text
.openrouter-cli/
├── history.json
├── project-config.json
├── files-cache.json
├── mcp.json
├── plugins.json
└── plugins/
```

These files are project-local and can be managed per repository.

## Trust

The trust database lives in global app data as `trusted.json`.

Trust levels:

- `TRUSTED PROJECT`: full access for the detected project root
- `TRUSTED FOLDER`: full access for a folder and subprojects
- `RESTRICTED`: read-only chat and explanation mode

In restricted mode, edits, shell commands, plugins, MCP execution, auto edits, and auto commands are disabled.
