# Plugin API

Plugin modules can export commands, slash commands, hooks, tools, and providers.

```js
export default {
  commands(program, context) {},
  slashCommands(context) {
    return [];
  },
  hooks: {},
  tools(registry, context) {},
  providers(registry, context) {}
};
```

## Context

The plugin context contains:

- `cwd`
- `manifest`
- `services`
- `tools`
- `providers`

## Register a Tool

```js
export default {
  tools(registry) {
    registry.register({
      name: "example.echo",
      description: "Echo input",
      permissions: ["read"],
      async execute(input) {
        return input;
      }
    });
  }
};
```

## Register a Provider

```js
export default {
  providers(registry) {
    registry.register({
      name: "example-provider",
      description: "Example provider",
      capabilities: ["chat"]
    });
  }
};
```

## Register a Command

```js
export default {
  commands(program) {
    program
      .command("example")
      .description("Run example")
      .action(() => {
        console.log("example");
      });
  }
};
```

## Register a Slash Command

```js
export default {
  slashCommands() {
    return [
      {
        name: "/example",
        description: "Run example",
        category: "Development",
        aliases: ["/ex"],
        async execute(context) {
          console.log(context.cwd);
        }
      }
    ];
  }
};
```

Plugins and plugin slash commands are disabled in restricted workspaces.
