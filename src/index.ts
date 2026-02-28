import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { generateText } from './openai.js';

const app = express();
const port = Number(process.env.PORT ?? 3030);

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const publicDir = path.resolve(currentDir, '..', 'public');

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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
