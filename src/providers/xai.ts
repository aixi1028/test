import 'dotenv/config';

const API_BASE_URL = 'https://api.x.ai/v1';

export async function generateXaiText(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing XAI_API_KEY environment variable.');
  }

  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'xAI request failed.';
    throw new Error(message);
  }

  const text = payload?.choices?.[0]?.message?.content;
  return text || '';
}

export async function generateXaiImage(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing XAI_API_KEY environment variable.');
  }

  const response = await fetch(`${API_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      response_format: 'b64_json'
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'xAI image request failed.';
    throw new Error(message);
  }

  const imageData = payload?.data?.[0]?.b64_json;
  if (!imageData) {
    throw new Error('No image data returned from xAI.');
  }

  return imageData;
}
