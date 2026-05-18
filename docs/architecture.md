# Architecture

openrouter-cli is organized around small modules with explicit boundaries:

- `ai` handles OpenRouter requests, streaming, retries, model listing, and prompting.
- `context` selects relevant repository files using ignore rules, size limits, extension filters, and relevance scoring.
- `filesystem` parses structured edit plans, renders diffs, and applies approved changes.
- `safety` blocks dangerous commands and sensitive file paths.
- `memory` persists session history in `.openrouter-cli/history.json`.
- `commands` contains user-facing CLI workflows.
- `terminal` owns formatting, spinners, markdown rendering, and shell execution.

The model never writes files directly. It returns a structured edit plan that the CLI validates, renders as a diff, and applies only after confirmation.
