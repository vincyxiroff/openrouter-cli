# Plugin Lifecycle Hooks

Plugins can subscribe to lifecycle hooks.

```js
export default {
  hooks: {
    async onInit(context) {},
    async onChatStart(context) {},
    async onBeforeRequest(messages, context) {},
    async onAfterRequest(response, context) {},
    async onFileEdit(changes, context) {},
    async onCommandExecution(command, context) {},
    async onShutdown(context) {}
  }
};
```

## Hooks

`onInit`
: Runs when the plugin is loaded.

`onChatStart`
: Runs when interactive chat starts.

`onBeforeRequest`
: Runs before an AI request is sent.

`onAfterRequest`
: Runs after an AI response is received.

`onFileEdit`
: Runs after approved file edits are applied.

`onCommandExecution`
: Runs before an approved shell command executes.

`onShutdown`
: Runs when the chat session exits.

Hook failures are isolated and time-limited.
