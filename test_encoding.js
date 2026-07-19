const fs = require('fs');
const iconv = require('iconv-lite');
const path = require('path');

const fileUtf8 = path.join(__dirname, 'chm-extracted', '2021', '20210117_Menjaga_persatuan.htm');
const fileWin1256 = path.join(__dirname, 'chm-extracted', '1995', '950219_Zakat_fitrah.htm');

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  const asUtf8 = buffer.toString('utf8');
  
  if (asUtf8.includes('\uFFFD')) {
    console.log(`${path.basename(filePath)} is NOT pure UTF-8 (contains \\uFFFD). Falling back to win1256...`);
    const asWin1256 = iconv.decode(buffer, 'win1256');
    console.log(`Preview (win1256):`, asWin1256.substring(0, 100).replace(/\n/g, ' '));
  } else {
    console.log(`${path.basename(filePath)} is valid UTF-8!`);
    console.log(`Preview (utf8):`, asUtf8.substring(0, 100).replace(/\n/g, ' '));
  }
}

checkFile(fileUtf8);
checkFile(fileWin1256);
