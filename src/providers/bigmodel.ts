import 'dotenv/config';
import OpenAI from 'openai';

const BIGMODEL_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

export async function generateBigModelText(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.BIGMODEL_API_KEY;
  if (!apiKey) {
    throw new Error('Missing BIGMODEL_API_KEY environment variable.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: BIGMODEL_BASE_URL
  });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.choices?.[0]?.message?.content;
  return text ?? '';
}

export async function generateBigModelImage(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.BIGMODEL_API_KEY;
  if (!apiKey) {
    throw new Error('Missing BIGMODEL_API_KEY environment variable.');
  }

  const response = await fetch(`${BIGMODEL_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'BigModel image request failed.';
    throw new Error(message);
  }

  const imageUrl = payload?.data?.[0]?.url || payload?.data?.[0]?.image || payload?.data?.[0]?.image_url;
  const imageBase64 = payload?.data?.[0]?.b64_json;

  if (imageBase64) {
    return imageBase64;
  }

  if (!imageUrl) {
    throw new Error('No image data returned from BigModel.');
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download BigModel image.');
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}
