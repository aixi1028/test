import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { generateImage, generateText } from './openai.js';

const app = express();
const port = Number(process.env.PORT ?? 3030);

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const publicDir = path.resolve(currentDir, '..', 'public');
const imageDir = path.join(publicDir, 'generated');
const imageMetaDir = path.resolve(currentDir, '..', 'data', 'images');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  if (!message) {
    console.warn('[chat] invalid request', { timestamp, requestId });
    res.status(400).json({ error: 'Message is required.', requestId });
    return;
  }

  try {
    console.log('[chat] request', { timestamp, requestId, message });
    const reply = await generateText(message);
    console.log('[chat] response', { timestamp, requestId, reply });
    res.json({ reply, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[chat] error', { timestamp, requestId, error: message });
    res.status(500).json({ error: message, requestId });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/image', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  if (!prompt) {
    console.warn('[image] invalid request', { timestamp, requestId });
    res.status(400).json({ error: 'Prompt is required.', requestId });
    return;
  }

  try {
    const selectedModel =
      model === 'gpt-image-1.5' || model === 'gpt-image-1' || model === 'gpt-image-1-mini'
        ? model
        : undefined;

    console.log('[image] request', { timestamp, requestId, prompt, model: selectedModel });
    const imageBase64 = await generateImage(prompt, { model: selectedModel });
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
    res.json({ imageBase64, imageUrl: `/generated/${filename}`, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[image] error', { timestamp, requestId, error: message });
    res.status(500).json({ error: message, requestId });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
