import { env, AutoTokenizer } from '@xenova/transformers';

// Disable local models, fetch from Hugging Face
env.allowLocalModels = false;

// В браузере @xenova/transformers автоматически кэширует скачанные модели в Cache API (IndexedDB).
// Они скачиваются только один раз и хранятся на диске пользователя.
// Если приложение будет переведено на Node.js бэкенд, можно раскомментировать строку ниже 
// для кэширования в локальную папку сервера:
// env.cacheDir = './models';

let o200k: any = null;
let cl100k: any = null;

const tokenizerCache: Record<string, any> = {};

export async function countTokens(text: string, providerId: string, modelId: string): Promise<{ count: number, tokens?: { id: number, text: string }[] }> {
  if (!text) return { count: 0, tokens: [] };

  if (providerId === 'openai') {
    if (!o200k || !cl100k) {
      const { getEncoding } = await import('js-tiktoken');
      if (!o200k) o200k = getEncoding('o200k_base');
      if (!cl100k) cl100k = getEncoding('cl100k_base');
    }

    const enc = (modelId.includes('gpt-4o') || modelId.includes('o1') || modelId.includes('o3') || modelId.includes('gpt-5') || modelId.includes('gpt-4.5')) 
      ? o200k 
      : cl100k;
    
    const encoded = enc.encode(text);
    const tokens = Array.from(encoded).map((id: any) => ({
      id: Number(id),
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
        id: Number(id),
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

export function releaseTiktoken() {
  o200k = null;
  cl100k = null;
  // Clear HF cache if needed, though it's managed by the library
  for (const key in tokenizerCache) {
    delete tokenizerCache[key];
  }
  if (typeof global !== 'undefined' && (global as any).gc) {
    (global as any).gc();
  }
}
