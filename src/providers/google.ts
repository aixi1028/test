import 'dotenv/config';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateGeminiText(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'Gemini request failed.';
    throw new Error(message);
  }

  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join('');

  return text || '';
}

async function generateGeminiImage(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'Gemini image request failed.';
    throw new Error(message);
  }

  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part: { inlineData?: { data?: string } }) => part.inlineData?.data);
  const imageData = imagePart?.inlineData?.data;
  if (!imageData) {
    throw new Error('No image data returned from Gemini.');
  }

  return imageData;
}

async function generateImagenImage(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateImages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      prompt
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'Imagen request failed.';
    throw new Error(message);
  }

  const generated =
    payload?.generatedImages?.[0] ||
    payload?.generated_images?.[0] ||
    payload?.images?.[0] ||
    payload?.data?.[0];
  const imageData =
    generated?.image ||
    generated?.imageBytes ||
    generated?.bytesBase64Encoded ||
    generated?.data ||
    generated?.b64_json;

  if (!imageData) {
    throw new Error('No image data returned from Imagen.');
  }

  return imageData;
}

export async function generateGoogleImage(prompt: string, model: string): Promise<string> {
  if (model.startsWith('imagen-')) {
    return generateImagenImage(prompt, model);
  }

  return generateGeminiImage(prompt, model);
}
