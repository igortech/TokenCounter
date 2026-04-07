import { AutoTokenizer, env } from '@xenova/transformers';
env.allowLocalModels = false;

async function test() {
  const models = [
    'deepseek-ai/deepseek-coder-6.7b-base',
    'Xenova/Qwen1.5-0.5B',
    'Xenova/gemma-tokenizer',
    'hf-internal-testing/llama-tokenizer',
    'Xenova/llama2-tokenizer',
    'Xenova/llama3-tokenizer',
    'Xenova/mistral-tokenizer',
    'Xenova/Mistral-7B-Instruct-v0.2'
  ];
  for (const m of models) {
    try {
      await AutoTokenizer.from_pretrained(m);
      console.log(m, 'OK');
    } catch (e: any) {
      console.log(m, 'FAIL', e.message);
    }
  }
}
test();
