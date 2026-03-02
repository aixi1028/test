import path from 'node:path';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { generateOpenaiImage, generateOpenaiText } from './providers/openai.js';
import { generateAnthropicText } from './providers/anthropic.js';
import { generateGeminiText, generateGoogleImage } from './providers/google.js';
import { generateXaiImage, generateXaiText } from './providers/xai.js';
import { generateDeepseekText } from './providers/deepseek.js';
import { generateQwenImage, generateQwenText } from './providers/qwen.js';
import { generateMoonshotText } from './providers/moonshot.js';
import { generateBigModelImage, generateBigModelText } from './providers/bigmodel.js';
import { generateDoubaoImage, generateDoubaoText } from './providers/doubao.js';

const app = express();
const port = Number(process.env.PORT ?? 3030);

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const publicDir = path.resolve(currentDir, '..', 'public');
const imageDir = path.join(publicDir, 'generated');
const imageMetaDir = path.resolve(currentDir, '..', 'data', 'images');

type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'qwen'
  | 'moonshot'
  | 'bigmodel'
  | 'doubao';
type ModelGroup = {
  text: string[];
  image: string[];
};

const providerKeyEnv: Record<ProviderId, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GEMINI_API_KEY',
  xai: 'XAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  qwen: 'QWEN_API_KEY',
  moonshot: 'MOONSHOT_API_KEY',
  bigmodel: 'BIGMODEL_API_KEY',
  doubao: 'DOUBAO_API_KEY'
};

const providers: Record<ProviderId, { label: string; models: ModelGroup; enabled: boolean }> = {
  openai: {
    label: 'OpenAI',
    models: {
      text: [
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        'gpt-5.1',
        'gpt-5.1-mini',
        'gpt-5.1-nano'
      ],
      image: ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini', 'dall-e-3', 'dall-e-2']
    },
    enabled: true
  },
  anthropic: {
    label: 'Anthropic',
    models: {
      text: [
        'claude-opus-4-1-20250805',
        'claude-opus-4-20250514',
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307'
      ],
      image: []
    },
    enabled: true
  },
  google: {
    label: 'Google',
    models: {
      text: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      image: [
        'gemini-2.5-flash-image',
        'imagen-4.0-generate-001',
        'imagen-4.0-ultra-generate-001',
        'imagen-4.0-fast-generate-001'
      ]
    },
    enabled: true
  },
  xai: {
    label: 'xAI',
    models: {
      text: [
        'grok-4-1-fast-reasoning',
        'grok-4-1-fast-non-reasoning',
        'grok-4-fast-reasoning',
        'grok-4-fast-non-reasoning',
        'grok-4',
        'grok-code-fast-1'
      ],
      image: ['grok-imagine-image']
    },
    enabled: true
  },
  deepseek: {
    label: 'DeepSeek',
    models: { text: ['deepseek-chat', 'deepseek-reasoner'], image: [] },
    enabled: true
  },
  qwen: {
    label: 'Qwen',
    models: {
      text: ['qwen-max', 'qwen-plus', 'qwen-flash', 'qwen-turbo'],
      image: ['qwen-image-max', 'qwen-image-plus', 'qwen-image']
    },
    enabled: true
  },
  moonshot: {
    label: 'Moonshot (Kimi)',
    models: { text: ['kimi-k2-thinking', 'kimi-k2-thinking-turbo'], image: [] },
    enabled: true
  },
  bigmodel: {
    label: 'BigModel (智谱)',
    models: { text: ['glm-4'], image: ['glm-image', 'cogview-3', 'cogview-3-flash'] },
    enabled: true
  },
  doubao: {
    label: 'Doubao (豆包)',
    models: {
      text: ['doubao-1-5-pro-32k-250115'],
      image: [
        'doubao-seedream-4-5-251128',
        'doubao-seedream-4-0-250828',
        'doubao-seedream-3-0-t2i-250415'
      ]
    },
    enabled: true
  }
};

function isProviderEnabled(providerId: ProviderId): boolean {
  const keyName = providerKeyEnv[providerId];
  return providers[providerId].enabled && Boolean(process.env[keyName]);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

app.get('/api/providers', (_req, res) => {
  const payload = Object.entries(providers).map(([id, provider]) => ({
    id,
    label: provider.label,
    enabled: isProviderEnabled(id as ProviderId),
    models: provider.models
  }));
  res.json({ providers: payload });
});

app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const provider = typeof req.body?.provider === 'string' ? req.body.provider.trim() : '';
  const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  if (!message) {
    console.warn('[chat] invalid request', { timestamp, requestId });
    res.status(400).json({ error: 'Message is required.', requestId });
    return;
  }

  try {
    const providerId = provider && provider in providers ? (provider as ProviderId) : 'openai';
    const providerInfo = providers[providerId];
    if (!isProviderEnabled(providerId)) {
      res.status(400).json({ error: 'Provider not enabled.', requestId });
      return;
    }

    if (providerInfo.models.text.length === 0) {
      res.status(400).json({ error: 'No text models configured for provider.', requestId });
      return;
    }

    const modelToUse = providerInfo.models.text.includes(model)
      ? model
      : providerInfo.models.text[0];

    console.log('[chat] request', {
      timestamp,
      requestId,
      provider: providerId,
      model: modelToUse,
      message
    });

    let reply = '';
    if (providerId === 'openai') {
      reply = await generateOpenaiText(message, { model: modelToUse });
    } else if (providerId === 'anthropic') {
      reply = await generateAnthropicText(message, modelToUse);
    } else if (providerId === 'google') {
      reply = await generateGeminiText(message, modelToUse);
    } else if (providerId === 'xai') {
      reply = await generateXaiText(message, modelToUse);
    } else if (providerId === 'deepseek') {
      reply = await generateDeepseekText(message, modelToUse);
    } else if (providerId === 'qwen') {
      reply = await generateQwenText(message, modelToUse);
    } else if (providerId === 'moonshot') {
      reply = await generateMoonshotText(message, modelToUse);
    } else if (providerId === 'bigmodel') {
      reply = await generateBigModelText(message, modelToUse);
    } else if (providerId === 'doubao') {
      reply = await generateDoubaoText(message, modelToUse);
    } else {
      res.status(400).json({ error: 'Provider not implemented yet.', requestId });
      return;
    }
    console.log('[chat] response', { timestamp, requestId, reply });
    res.json({ reply, requestId, modelUsed: modelToUse, provider: providerId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[chat] error', { timestamp, requestId, error: message });
    res.status(500).json({ error: message, requestId });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/images', async (_req, res) => {
  try {
    await mkdir(imageMetaDir, { recursive: true });
    const entries = await readdir(imageMetaDir);
    const images = await Promise.all(
      entries
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          const filePath = path.join(imageMetaDir, name);
          const raw = await readFile(filePath, 'utf8');
          const data = JSON.parse(raw);
          if (!data?.filename) {
            return null;
          }
          return {
            id: data.id ?? name.replace(/\.json$/, ''),
            prompt: data.prompt ?? '',
            filename: data.filename,
            provider: data.provider ?? '',
            model: data.model ?? '',
            bytes: data.bytes ?? 0,
            createdAt: data.createdAt ?? '',
            imageUrl: `/generated/${data.filename}`
          };
        })
    );

    const cleaned = images.filter((item): item is NonNullable<typeof item> => Boolean(item));
    cleaned.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json({ images: cleaned });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[images] error', { error: message });
    res.status(500).json({ error: message });
  }
});

app.post('/api/image', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const provider = typeof req.body?.provider === 'string' ? req.body.provider.trim() : '';
  const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  if (!prompt) {
    console.warn('[image] invalid request', { timestamp, requestId });
    res.status(400).json({ error: 'Prompt is required.', requestId });
    return;
  }

  try {
    const providerId = provider && provider in providers ? (provider as ProviderId) : 'openai';
    const providerInfo = providers[providerId];
    if (!isProviderEnabled(providerId)) {
      res.status(400).json({ error: 'Provider not enabled.', requestId });
      return;
    }

    if (providerInfo.models.image.length === 0) {
      res.status(400).json({ error: 'No image models configured for provider.', requestId });
      return;
    }

    const modelToUse = providerInfo.models.image.includes(model)
      ? model
      : providerInfo.models.image[0];

    console.log('[image] request', {
      timestamp,
      requestId,
      prompt,
      provider: providerId,
      model: modelToUse
    });

    let modelUsed = modelToUse;
    let imageBase64: string;

    try {
      if (providerId === 'openai') {
        imageBase64 = await generateOpenaiImage(prompt, { model: modelToUse });
      } else if (providerId === 'google') {
        imageBase64 = await generateGoogleImage(prompt, modelToUse);
      } else if (providerId === 'xai') {
        imageBase64 = await generateXaiImage(prompt, modelToUse);
      } else if (providerId === 'qwen') {
        imageBase64 = await generateQwenImage(prompt, modelToUse);
      } else if (providerId === 'bigmodel') {
        imageBase64 = await generateBigModelImage(prompt, modelToUse);
      } else if (providerId === 'doubao') {
        imageBase64 = await generateDoubaoImage(prompt, modelToUse);
      } else {
        res.status(400).json({ error: 'Provider not implemented yet.', requestId });
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const shouldFallback =
        !!modelToUse &&
        message.toLowerCase().includes('model') &&
        message.toLowerCase().includes('not found');

      if (!shouldFallback) {
        throw error;
      }

      modelUsed =
        providerId === 'google'
          ? 'gemini-2.5-flash-image'
          :
        providerId === 'xai'
          ? 'grok-imagine-image'
          : providerId === 'qwen'
          ? 'qwen-image-max'
          : providerId === 'bigmodel'
          ? 'glm-image'
          : providerId === 'doubao'
          ? 'doubao-seedream-4-5-251128'
          : 'gpt-image-1';
      console.warn('[image] fallback model', {
        timestamp,
        requestId,
        from: modelToUse,
        to: modelUsed
      });
      if (providerId === 'google') {
        imageBase64 = await generateGoogleImage(prompt, modelUsed);
      } else if (providerId === 'xai') {
        imageBase64 = await generateXaiImage(prompt, modelUsed);
      } else if (providerId === 'qwen') {
        imageBase64 = await generateQwenImage(prompt, modelUsed);
      } else if (providerId === 'bigmodel') {
        imageBase64 = await generateBigModelImage(prompt, modelUsed);
      } else if (providerId === 'doubao') {
        imageBase64 = await generateDoubaoImage(prompt, modelUsed);
      } else {
        imageBase64 = await generateOpenaiImage(prompt, { model: modelUsed });
      }
    }
    await mkdir(imageDir, { recursive: true });
    await mkdir(imageMetaDir, { recursive: true });

    const filename = `${requestId}.png`;
    const filePath = path.join(imageDir, filename);
    const metadataPath = path.join(imageMetaDir, `${requestId}.json`);
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    await writeFile(filePath, imageBuffer);
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          id: requestId,
          prompt,
          filename,
          provider: providerId,
          model: modelUsed,
          bytes: imageBuffer.length,
          createdAt: timestamp
        },
        null,
        2
      )
    );

    console.log('[image] response', {
      timestamp,
      requestId,
      bytes: imageBuffer.length,
      file: filename
    });
    res.json({
      imageBase64,
      imageUrl: `/generated/${filename}`,
      requestId,
      modelUsed,
      provider: providerId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[image] error', { timestamp, requestId, error: message });
    res.status(500).json({ error: message, requestId });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
