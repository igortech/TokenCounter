import { getEncoding } from 'js-tiktoken';
const enc = getEncoding('cl100k_base');
const tokens = enc.encode("Hello world! Привет мир!");
console.log(tokens);
tokens.forEach(t => {
  try {
    const dec = enc.decode([t]);
    console.log(t, dec);
  } catch(e) {
    console.log(t, "ERROR");
  }
});
