import { ChmFile, chmReaderFromBuffer } from 'chmlib-ts';
import fs from 'fs/promises';

async function test() {
  const data = await fs.readFile('./data/Kitab-9-Imam.chm');
  const uint8Buffer = new Uint8Array(data);
  const reader = chmReaderFromBuffer(uint8Buffer);
  const chmFile = await ChmFile.open(reader);
  
  for await (const ui of chmFile.enumerate(31)) {
    if (ui.path.endsWith('/H1K01B1.html')) {
      const contentBytes = await chmFile.retrieve(ui);
      const text = Buffer.from(contentBytes).toString('utf8');
      console.log(text);
      break;
    }
  }
  if (reader.close) await reader.close();
}
test().catch(console.error);
