import 'dotenv/config';
import OpenAI from 'openai';

type GenerateOptions = {
  model?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
};

export async function generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  const client = new OpenAI({
    apiKey,
    timeout: options.timeoutMs ?? 30_000,
    maxRetries: options.maxRetries ?? 2
  });

  try {
    const response = await client.responses.create({
      model: options.model ?? 'gpt-5.2',
      input: prompt,
      max_output_tokens: options.maxOutputTokens ?? 256
    });

    return response.output_text ?? '';
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const requestId = error.request_id ? ` [request_id: ${error.request_id}]` : '';
      const status = error.status ? ` ${error.status}` : '';
      throw new Error(
        `OpenAI API error (${error.name}${status})${requestId}: ${error.message}`,
        { cause: error }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`OpenAI request failed: ${message}`, { cause: error });
  }
}
