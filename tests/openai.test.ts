import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('openai', () => {
  class APIError extends Error {
    request_id?: string;
    status?: number;

    constructor(message: string, requestId?: string, status?: number) {
      super(message);
      this.name = 'APIError';
      this.request_id = requestId;
      this.status = status;
    }
  }

  return {
    default: class OpenAI {
      static APIError = APIError;
      APIError = APIError;

      constructor() {
        return this;
      }
    }
  };
});

const OpenAI = (await import('openai')).default as any;
OpenAI.prototype.responses = {
  create: vi.fn(async () => ({ output_text: 'mocked response' }))
};

const { generateText } = await import('../src/openai.js');

describe('generateText', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('returns output_text from the response', async () => {
    const text = await generateText('Hello');
    expect(text).toBe('mocked response');
  });

  it('wraps API errors with request id', async () => {
    const OpenAI = (await import('openai')).default as any;
    OpenAI.prototype.responses.create.mockRejectedValueOnce(
      new OpenAI.APIError('Bad request', 'req_123', 400)
    );

    await expect(generateText('Hello')).rejects.toThrow('request_id: req_123');
  });
});
