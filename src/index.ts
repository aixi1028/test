import { generateText } from './openai.js';

export async function runExample(prompt: string): Promise<string> {
  return generateText(prompt);
}

if (import.meta.main) {
  const prompt = process.argv.slice(2).join(' ') || 'Say hello in one sentence.';
  runExample(prompt)
    .then((text) => {
      console.log(text);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
