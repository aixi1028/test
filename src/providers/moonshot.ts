import 'dotenv/config';
import OpenAI from 'openai';

const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

export async function generateMoonshotText(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('Missing MOONSHOT_API_KEY environment variable.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: MOONSHOT_BASE_URL
  });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.choices?.[0]?.message?.content;
  return text ?? '';
}
