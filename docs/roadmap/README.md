# Roadmap MVP Architecture

This project includes production-oriented MVP foundations for the roadmap features.

## Completed MVP Foundations

- VS Code extension package in `vscode-extension/`
- Local provider abstraction in `src/providers/`
- Plugin marketplace registry client in `src/plugins/registry/marketplace.ts`
- Voice mode adapters in `src/voice/`
- Multi-agent workflow config in `src/agents/`
- Dashboard shell in `src/dashboard/`
- Team collaboration config planning in `src/team/`
- Agent tool-loop continuation in `src/agents/toolLoop.ts`
- Slash command autocomplete in `src/commands/slash/`
- File mention autocomplete and context injection in `src/mentions/`
- Trust project/folder security in `src/trust/`
- OS app-data and project-data path management in `src/storage/`

## Provider Commands

```bash
orc providers
orc provider setup
```

Supported provider adapters:

- OpenRouter
- Ollama
- LM Studio
- llama.cpp
- OpenAI-compatible local APIs

## Roadmap Commands

```bash
orc voice
orc agents
orc agents:init
orc workflow "build auth system"
orc dashboard
orc team
orc team:init
orc trust
```
