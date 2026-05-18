# Model Discovery

Models are discovered dynamically from OpenRouter.

```text
GET https://openrouter.ai/api/v1/models
Authorization: Bearer OPENROUTER_API_KEY
Content-Type: application/json
```

The model registry handles:

- live model loading
- six-hour cache in `.openrouter-cli/models-cache.json`
- stale cache fallback
- free model detection
- search
- provider filtering
- context length filtering
- multimodal filtering
- reasoning filtering
- recommendations for setup

Free models are detected through:

- model id suffix `:free`
- zero pricing metadata
- OpenRouter metadata

The CLI never hardcodes a model catalog.
