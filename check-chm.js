const fs = require('fs');

async function main() {
  const chmlib = await import('chmlib-ts');
  const buf = fs.readFileSync('./data/Kitab-9-Imam.chm');
  const uint8Buffer = new Uint8Array(buf);
  const reader = chmlib.chmReaderFromBuffer(uint8Buffer);
  const chmFile = await chmlib.ChmFile.open(reader);
  
  for await (const ui of chmFile.enumerate(31)) {
    if (ui.path === '/had/H1K02B03.html') {
      const data = await chmFile.retrieve(ui);
      const str = Buffer.from(data).toString('utf-8');
      console.log(str.slice(1500, 4000));
      break;
    }
  }
}

main().catch(console.error);
