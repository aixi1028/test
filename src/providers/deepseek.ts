import 'dotenv/config';
import OpenAI from 'openai';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export async function generateDeepseekText(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY environment variable.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE_URL
  });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.choices?.[0]?.message?.content;
  return text ?? '';
}
