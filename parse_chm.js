const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const chmDir = path.join(__dirname, 'chm-extracted');
const dataDir = path.join(__dirname, 'data');
const contentDir = path.join(dataDir, 'content');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir);

const indexList = [];

function generateSlug(year, dateStr, title) {
  // BAP (Brosur Ahad Pagi)- tahun bulan tanggal judul
  // dateStr is YYYYMMDD, e.g. 19950212
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  // Clean title
  let cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  cleanTitle = cleanTitle.substring(0, 60).replace(/-$/, ''); // Truncate and remove trailing hyphen
  
  return `BAP-(Brosur-Ahad-Pagi)-${year}-${month}-${day}-${cleanTitle}`;
}

// Get all year folders
const years = fs.readdirSync(chmDir).filter(f => /^\d{4}$/.test(f));

for (const year of years) {
  const yearDir = path.join(chmDir, year);
  const files = fs.readdirSync(yearDir).filter(f => f.endsWith('.htm') || f.endsWith('.html'));

  for (const file of files) {
    const filePath = path.join(yearDir, file);
    // Read as buffer to auto-detect charset (UTF-8 vs Windows-1256)
    const buffer = fs.readFileSync(filePath);
    let content = buffer.toString('utf8');
    
    // If the file is not valid UTF-8 (e.g. contains Arabic win1256 bytes), it will have replacement characters (\uFFFD)
    if (content.includes('\uFFFD')) {
      content = iconv.decode(buffer, 'win1256');
    }
    
    const $ = cheerio.load(content);

    let title = $('title').text().trim();
    if (!title) {
      title = $('h1, h2, h3, h4, font[size="+1"]').first().text().trim() || file.replace(/\.html?$/, '');
    }

    let mainContent = $('#winchm_template_content').html();
    if (!mainContent) {
      mainContent = $('body').html() || content;
    }

    const $main = cheerio.load(mainContent);
    $main('script, style, link, meta').remove();
    $main('*').removeAttr('style');
    $main('*').removeAttr('class');
    $main('*').removeAttr('id');
    $main('*:empty').not('img, br, hr').remove();

    const dateStr = file.replace(/\.html?$/, '');
    let cleanTitle = title.replace(/^\d{8}\s*\((.*?)\)$/, '$1');
    if (cleanTitle.length > 100) cleanTitle = cleanTitle.substring(0, 100) + '...';
    
    const slug = generateSlug(year, dateStr, cleanTitle);

    const fullHtml = $main('body').html() || $main.html();
    
    // Save metadata to index
    indexList.push({
      id: `${year}-${dateStr}`,
      tahun: parseInt(year, 10),
      judul: cleanTitle,
      slug: slug
    });

    // Save individual content file
    fs.writeFileSync(path.join(contentDir, `${slug}.json`), JSON.stringify({
      id: `${year}-${dateStr}`,
      tahun: parseInt(year, 10),
      judul: cleanTitle,
      slug: slug,
      konten: fullHtml
    }));
  }
}

// Sort by year desc, then id desc
indexList.sort((a, b) => b.id.localeCompare(a.id));

// Also write a full file for the server search index (optional, but good for /api/search)
const fullDataPath = path.join(dataDir, 'brosur.json');

fs.writeFileSync(path.join(dataDir, 'index.json'), JSON.stringify(indexList, null, 2));

console.log(`Successfully parsed ${indexList.length} brosur items.`);
console.log(`Index saved to data/index.json`);
console.log(`Content files saved to data/content/`);
