import 'dotenv/config';
import OpenAI from 'openai';

const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const SEEDREAM_BASE_URL =
  process.env.SEEDREAM_BASE_URL || 'https://operator.las.cn-beijing.volces.com/api/v1';

function getApiKey(): string {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DOUBAO_API_KEY environment variable.');
  }
  return apiKey;
}

function getSeedreamApiKey(): string {
  const apiKey = process.env.SEEDREAM_API_KEY || process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    throw new Error('Missing SEEDREAM_API_KEY or DOUBAO_API_KEY environment variable.');
  }
  return apiKey;
}

export async function generateDoubaoText(prompt: string, model: string): Promise<string> {
  const client = new OpenAI({
    apiKey: getApiKey(),
    baseURL: DOUBAO_BASE_URL
  });

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.choices?.[0]?.message?.content;
    return text ?? '';
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('[doubao] chat error', {
        status: error.status,
        message: error.message,
        requestId: error.request_id,
        type: error.type,
        code: error.code,
        baseURL: DOUBAO_BASE_URL,
        model
      });
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[doubao] chat error', { message, baseURL: DOUBAO_BASE_URL, model });
    }
    throw error;
  }
}

export async function generateDoubaoImage(prompt: string, model: string): Promise<string> {
  const response = await fetch(`${SEEDREAM_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${getSeedreamApiKey()}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '2048x2048',
      response_format: 'b64_json',
      watermark: false
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Doubao image request failed.';
    throw new Error(message);
  }

  const imageBase64 = payload?.data?.[0]?.b64_json;
  if (imageBase64) {
    return imageBase64;
  }

  const imageUrl = payload?.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image data returned from Doubao.');
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download Doubao image.');
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}
