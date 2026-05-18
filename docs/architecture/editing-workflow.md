# AI Editing Workflow

`orc edit` follows a strict file safety flow.

1. Load `.openrouter-cli.json`.
2. Build smart context from relevant files.
3. Ask OpenRouter for a structured JSON edit plan.
4. Validate the edit plan with Zod.
5. Render a unified diff.
6. Ask the user to approve file changes.
7. Apply approved changes.
8. Ask before running suggested commands.
9. Save session history.
10. Emit plugin lifecycle hooks.

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

The CLI validates paths and blocks sensitive files before writing.
