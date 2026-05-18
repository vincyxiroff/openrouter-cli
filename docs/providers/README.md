# Local Providers

`openrouter-cli` uses a provider abstraction so the agent can run against OpenRouter or local model backends.

## Supported MVP Providers

- OpenRouter
- Ollama
- LM Studio
- llama.cpp
- OpenAI-compatible local APIs

## Commands

```bash
orc providers
orc provider setup
```

## Config

```json
{
  "provider": "ollama",
  "model": "qwen3"
}
```

## Ollama

The Ollama adapter checks:

```text
http://localhost:11434
```

It lists models through the Ollama API and falls back to:

```bash
ollama list
```

## LM Studio

The LM Studio adapter uses:

```text
http://localhost:1234/v1
```

## llama.cpp

The llama.cpp adapter uses:

```text
http://localhost:8080/v1
```

Set `ORC_LLAMA_CPP_URL` to override it.

## Local API

The generic local OpenAI-compatible adapter uses:

```text
http://localhost:8000/v1
```

Set `ORC_LOCAL_API_URL` to override it.
