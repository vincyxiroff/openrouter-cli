# AI Editing Workflow

`orc edit` follows a strict file safety flow.

1. Resolve trust state.
2. Load `.openrouter-cli/project-config.json` with legacy fallback.
3. Build smart context from relevant files and `@file` mentions.
4. Ask OpenRouter for a structured JSON edit plan.
5. Validate the edit plan with Zod.
6. Render a unified diff.
7. Ask the user to approve file changes unless trusted auto edit mode is enabled.
8. Apply approved changes.
9. Ask before running suggested commands unless trusted auto command mode is enabled.
10. Save session history.
11. Emit plugin lifecycle hooks.

The model response must match this shape:

```json
{
  "summary": "description",
  "reasoning": "why",
  "changes": [
    {
      "type": "update",
      "path": "src/index.ts",
      "content": "full file"
    }
  ],
  "commands": ["npm test"]
}
```

The CLI validates paths and blocks sensitive files before writing. In restricted workspaces, editing stops before the model is asked for an edit plan.
