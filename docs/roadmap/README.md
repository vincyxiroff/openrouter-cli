# Roadmap MVP Architecture

This project includes production-oriented MVP foundations for the roadmap features.

## Completed MVP Foundations

- VSCode extension package in `vscode-extension/`
- Local provider abstraction in `src/providers/`
- Plugin marketplace registry client in `src/plugins/registry/marketplace.ts`
- Voice mode adapters in `src/voice/`
- Multi-agent workflow config in `src/agents/`
- Dashboard shell in `src/dashboard/`
- Team collaboration config planning in `src/team/`

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
```
