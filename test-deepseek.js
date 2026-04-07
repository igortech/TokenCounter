import { encodingForModel } from '@cyberlangke/tokkit-deepseek';
async function run() {
  try {
    const enc = await encodingForModel('deepseek-ai/DeepSeek-V3.1');
    console.log(Object.keys(enc));
    console.log(enc.encode('hello world'));
  } catch (e) {
    console.error(e);
  }
}
run();
