import 'dotenv/config';
import OpenAI from 'openai';

type GenerateOptions = {
  model?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
};

type GenerateImageOptions = {
  model?: string;
  quality?: 'low' | 'medium' | 'high';
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  timeoutMs?: number;
  maxRetries?: number;
};

function createClient(options: GenerateOptions | GenerateImageOptions = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  return new OpenAI({
    apiKey,
    timeout: options.timeoutMs ?? 30_000,
    maxRetries: options.maxRetries ?? 2
  });
}

export async function generateOpenaiText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const client = createClient(options);

  try {
    const response = await client.responses.create({
      model: options.model ?? 'gpt-5-mini',
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

export async function generateOpenaiImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<string> {
  const client = createClient(options);

  try {
    const model = options.model ?? 'gpt-image-1';
    const useDalle = model.startsWith('dall-e');

    const response = await client.images.generate({
      model,
      prompt,
      quality: options.quality ?? 'medium',
      size: options.size ?? '1024x1024',
      ...(useDalle ? { response_format: 'b64_json' } : { output_format: 'png' })
    });

    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image data returned from OpenAI.');
    }

    return imageData;
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
