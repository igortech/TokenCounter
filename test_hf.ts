import { env, AutoTokenizer } from '@xenova/transformers';

env.allowLocalModels = false;

async function test() {
  const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gemma-tokenizer');
  const tokens = tokenizer.encode("Hello world! Привет мир!");
  console.log(tokens);
  tokens.forEach(t => {
    try {
      // @xenova/transformers tokenizer decode
      const dec = tokenizer.decode([t]);
      console.log(t, dec);
    } catch(e) {
      console.log(t, "ERROR");
    }
  });
}
test();
