# test

## Environment Variables

Set the following variables in your environment (or via a `.env` file) before running:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `XAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `MOONSHOT_API_KEY`
- `BIGMODEL_API_KEY`
- `DOUBAO_API_KEY`

Optional overrides:

- `QWEN_COMPAT_BASE_URL`
- `QWEN_IMAGE_BASE_URL`
- `DOUBAO_BASE_URL`
- `SEEDREAM_BASE_URL`

## API Usage

### Text chat

```bash
curl -s http://localhost:3030/api/chat \
  -H 'content-type: application/json' \
  -d '{
    "message": "Hello from Doubao!",
    "provider": "doubao",
    "model": "doubao-1-5-pro-32k-250115"
  }'
```

### Image generation

```bash
curl -s http://localhost:3030/api/image \
  -H 'content-type: application/json' \
  -d '{
    "prompt": "A cozy reading nook with warm lighting, watercolor style.",
    "provider": "doubao",
    "model": "doubao-seedream-4-5-251128"
  }'
```
