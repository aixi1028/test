import 'dotenv/config';
import OpenAI from 'openai';

const QWEN_COMPAT_BASE_URL =
  process.env.QWEN_COMPAT_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const QWEN_IMAGE_BASE_URL =
  process.env.QWEN_IMAGE_BASE_URL ||
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

export async function generateQwenText(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('Missing QWEN_API_KEY environment variable.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: QWEN_COMPAT_BASE_URL
  });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.choices?.[0]?.message?.content;
  return text ?? '';
}

export async function generateQwenImage(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('Missing QWEN_API_KEY environment variable.');
  }

  const response = await fetch(QWEN_IMAGE_BASE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: {
        prompt
      }
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || 'Qwen image request failed.';
    throw new Error(message);
  }

  const imageUrl = payload?.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) {
    throw new Error('No image URL returned from Qwen.');
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download Qwen image.');
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}
