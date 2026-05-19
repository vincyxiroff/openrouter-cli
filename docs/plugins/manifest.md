# Plugin Manifest

Every plugin must define a `plugin.json` manifest.

```json
{
  "name": "github-plugin",
  "version": "1.0.0",
  "description": "GitHub integration",
  "author": "community",
  "entry": "./index.js"
}
```

## Fields

`name`
: Unique local plugin name.

`version`
: Plugin version.

`description`
: Human-readable summary.

`author`
: Plugin author or organization.

`entry`
: JavaScript module loaded by the plugin loader.

## Enabled Plugins

Enabled state is stored in:

```text
.openrouter-cli/plugins.json
```

```json
{
  "enabled": ["github-plugin", "docker-plugin"]
}
```

Installed local plugin files live under `.openrouter-cli/plugins/`.
