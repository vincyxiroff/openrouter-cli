# Testing

The test suite uses Vitest.

```bash
npm test
```

Current coverage focuses on:

- safety policies
- JSON extraction
- edit plan validation
- model registry filtering
- `.env` updates
- plugin manifest and local install flow
- MCP config and tool registry

Before publishing or opening a PR, run:

```bash
npm run build
npm run lint
npm test
npm run format:check
npm audit
npm pack --dry-run
```
