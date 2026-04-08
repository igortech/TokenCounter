import { getEncoding } from 'js-tiktoken';
import { env, AutoTokenizer } from '@xenova/transformers';

// Disable local models, fetch from Hugging Face
env.allowLocalModels = false;

// В браузере @xenova/transformers автоматически кэширует скачанные модели в Cache API (IndexedDB).
// Они скачиваются только один раз и хранятся на диске пользователя.
// Если приложение будет переведено на Node.js бэкенд, можно раскомментировать строку ниже 
// для кэширования в локальную папку сервера:
// env.cacheDir = './models';

const o200k = getEncoding('o200k_base');
const cl100k = getEncoding('cl100k_base');

const tokenizerCache: Record<string, any> = {};

export async function countTokens(text: string, providerId: string, modelId: string): Promise<{ count: number, tokens?: { id: number, text: string }[] }> {
  if (!text) return { count: 0, tokens: [] };

  if (providerId === 'openai') {
    const enc = (modelId.includes('gpt-4o') || modelId.includes('o1') || modelId.includes('o3') || modelId.includes('gpt-5') || modelId.includes('gpt-4.5')) 
      ? o200k 
      : cl100k;
    
    const encoded = enc.encode(text);
    const tokens = Array.from(encoded).map(id => ({
      id,
      text: enc.decode([id])
    }));
    
    return { count: encoded.length, tokens };
  }

  if (['deepseek', 'meta', 'hf'].includes(providerId)) {
    try {
      if (!tokenizerCache[modelId]) {
        tokenizerCache[modelId] = await AutoTokenizer.from_pretrained(modelId);
      }
      const tokenizer = tokenizerCache[modelId];
      const encoded = tokenizer.encode(text);
      
      // Convert Int32Array or similar to standard array for mapping
      const tokens = Array.from(encoded).map((id: any) => ({
        id,
        text: tokenizer.decode([id])
      }));
      
      return { count: encoded.length, tokens };
    } catch (e: any) {
      console.error("HF Tokenizer error:", e);
      throw new Error(`Failed to load tokenizer for ${modelId}. It might not be supported in browser.`);
    }
  }

  throw new Error("Exact calculation not available for this provider");
}
