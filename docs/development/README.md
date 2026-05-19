# Development Guide

## Install

```bash
npm install
```

## Common Tasks

```bash
npm run build
npm run lint
npm test
npm run format:check
```

## Run Locally

```bash
npm run dev -- --help
npm run dev -- setup
npm run dev -- models --free
```

## Project Standards

- Node.js 22+
- TypeScript strict mode
- No hardcoded secrets
- No automatic shell execution
- Auto shell execution only in trusted workspaces
- No direct AI file writes
- Use `src/storage` helpers for global and project-local paths
- Keep modules small and explicit
- Add tests for behavior changes
