# Plugin Development

Plugins allow community extensions without changing the core CLI.

## Plugin Location

Local plugins live under:

```text
.openrouter-cli/plugins/<plugin-name>/
```

Each plugin must include:

```text
plugin.json
index.js
```

## Install a Local Plugin

```bash
orc plugin install ./plugins/my-plugin
orc plugin list
orc plugin enable my-plugin
```

## Minimal Plugin

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Example plugin",
  "author": "community",
  "entry": "./index.js"
}
```

```js
export default {
  commands(program) {
    program
      .command("hello")
      .description("Say hello")
      .action(() => {
        console.log("Hello from plugin");
      });
  }
};
```

## Capabilities

Plugins can register:

- commands
- lifecycle hooks
- tools
- providers

Failures are isolated. A plugin error should not crash the CLI.
