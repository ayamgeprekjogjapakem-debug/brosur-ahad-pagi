import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';
import { formatParagraphWithArabic } from '@/utils/arabic-normalizer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileName = body.fileName;
    const action = body.action || 'extract';
    const selectedFiles: string[] = body.selectedFiles || [];

    if (!fileName || (!fileName.endsWith('.zip') && !fileName.endsWith('.chm') && !fileName.endsWith('.pdf') && !fileName.endsWith('.html') && !fileName.endsWith('.htm'))) {
      return NextResponse.json({ error: 'File tidak valid atau bukan file .zip / .chm / .pdf / .html.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verifikasi Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Download zip dari Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage.from('chm-uploads').download(fileName);
    
    if (downloadError || !fileData) {
      console.error('Download Error:', downloadError);
      return NextResponse.json({ error: 'Gagal mengunduh file dari Storage.' }, { status: 500 });
    }

    // 3. Ekstrak file di memori
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`📦 Mengunduh ${fileName} dari Storage. Ukuran: ${buffer.length} bytes`);

    // 3.5 Buat atau cari Master Koleksi (Folder) otomatis (Hanya jika action = extract)
    const folderName = fileName.replace(/\.(chm|zip|pdf)$/i, '');
    let folderId = null;

    const destination = body.destination || (fileName.toUpperCase().startsWith('HADIST_') ? 'hadist_chm' : 'brosur');
    const isHadist = destination === 'hadist_chm';
    const folderTable = isHadist ? 'folders_hadist' : 'folders';
    const contentTable = isHadist ? 'hadist_chm' : 'brosur';

    if (action === 'extract') {
      const { data: existingFolder } = await supabase
        .from(folderTable)
        .select('id')
        .eq('name', folderName)
        .single();

      if (existingFolder) {
        folderId = existingFolder.id;
      } else {
        const folderSlug = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const { data: newFolder, error: folderError } = await supabase
          .from(folderTable)
          .insert({ 
            name: folderName, 
            slug: folderSlug,
            description: `Diimpor otomatis dari arsip ${fileName}` 
          })
          .select('id')
          .single();
        
        if (!folderError && newFolder) {
          folderId = newFolder.id;
        } else if (folderError) {
          console.error('Gagal membuat folder otomatis:', folderError);
        }
      }
    }

    let extractResults: any[] = [];
    let successCount = 0;

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const pendingHtmls: { entryName: string, content: string }[] = [];
    const imageUrlMap = new Map<string, string>();

    const getMimeType = (ext: string) => {
      switch(ext) {
        case '.png': return 'image/png';
        case '.jpg': case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        case '.svg': return 'image/svg+xml';
        default: return 'application/octet-stream';
      }
    };

    if (fileName.endsWith('.zip')) {
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      
      if (action === 'preview') {
         const htmlFiles = zipEntries
           .filter((entry: any) => !entry.isDirectory && (entry.entryName.toLowerCase().endsWith('.html') || entry.entryName.toLowerCase().endsWith('.htm')))
           .map((entry: any) => entry.entryName);
         return NextResponse.json({ success: true, files: htmlFiles });
      }

      console.log(`📦 Ditemukan ${zipEntries.length} entries di dalam ZIP.`);
      
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        const entryName = entry.entryName;
        const lowerName = entryName.toLowerCase();
        
        const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm');
        const isImage = imageExtensions.some(ext => lowerName.endsWith(ext));

        if (isHtml) {
          if (selectedFiles.length > 0 && !selectedFiles.includes(entryName)) continue;

          console.log('🔍 ZIP Entry HTML:', entryName);
          const contentStr = decodeHtmlBuffer(entry.getData());
          pendingHtmls.push({ entryName, content: contentStr });
        } else if (isImage) {
          console.log('🖼️ ZIP Entry Gambar:', entryName);
          const ext = imageExtensions.find(e => lowerName.endsWith(e)) || '';
          const fileNameOnly = entryName.split('/').pop() || entryName;
          const destPath = `assets/${fileNameOnly}`;
          
          const { error: uploadError } = await supabase.storage.from('chm-uploads').upload(destPath, entry.getData(), {
            upsert: true,
            contentType: getMimeType(ext)
          });
          
          if (!uploadError) {
            const { data: publicData } = supabase.storage.from('chm-uploads').getPublicUrl(destPath);
            imageUrlMap.set(fileNameOnly.toLowerCase(), publicData.publicUrl);
          }
        }
      }
    } else if (fileName.endsWith('.chm')) {
      try {
        const { ChmFile, chmReaderFromBuffer } = await import('chmlib-ts');
        const uint8Buffer = new Uint8Array(arrayBuffer);
        const reader = chmReaderFromBuffer(uint8Buffer);
        const chmFile = await ChmFile.open(reader);
        
        if (action === 'preview') {
          const htmlFiles = [];
          for await (const ui of chmFile.enumerate(31)) {
             const lowerName = ui.path.toLowerCase();
             if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
                 htmlFiles.push(ui.path);
             }
          }
          if (reader.close) await reader.close();

          // Cek ID yang sudah diekstrak
          let existingIds: string[] = [];
          const folderName = fileName.replace(/\.(chm|zip|pdf)$/i, '');
          const destination = body.destination || (fileName.toUpperCase().startsWith('HADIST_') ? 'hadist_chm' : 'brosur');
          const isHadist = destination === 'hadist_chm';
          const folderTable = isHadist ? 'folders_hadist' : 'folders';
          const contentTable = isHadist ? 'hadist_chm' : 'brosur';

          const { data: existingFolder } = await supabase.from(folderTable).select('id').eq('name', folderName).single();
          if (existingFolder) {
            const { data: existingData } = await supabase.from(contentTable).select('id').eq('folder_id', existingFolder.id);
            if (existingData) existingIds = existingData.map(row => row.id);
          }

          return NextResponse.json({ success: true, files: htmlFiles, existingIds });
        }

        console.log(`📦 Membuka file CHM...`);
        for await (const ui of chmFile.enumerate(31)) {
          const entryName = ui.path;
          const lowerName = entryName.toLowerCase();
          
          const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm');
          const isImage = imageExtensions.some(ext => lowerName.endsWith(ext));

          if (isHtml) {
            if (selectedFiles.length > 0 && !selectedFiles.includes(entryName)) continue;

            console.log('🔍 CHM Entry HTML:', entryName);
            const contentBytes = await chmFile.retrieve(ui);
            const contentStr = decodeHtmlBuffer(Buffer.from(contentBytes));
            pendingHtmls.push({ entryName, content: contentStr });
          } else if (isImage) {
            console.log('🖼️ CHM Entry Gambar:', entryName);
            const ext = imageExtensions.find(e => lowerName.endsWith(e)) || '';
            const fileNameOnly = entryName.split('/').pop() || entryName;
            const destPath = `assets/${fileNameOnly}`;
            
            const contentBytes = await chmFile.retrieve(ui);
            const { error: uploadError } = await supabase.storage.from('chm-uploads').upload(destPath, contentBytes, {
              upsert: true,
              contentType: getMimeType(ext)
            });
            
            if (!uploadError) {
              const { data: publicData } = supabase.storage.from('chm-uploads').getPublicUrl(destPath);
              imageUrlMap.set(fileNameOnly.toLowerCase(), publicData.publicUrl);
            }
          }
        }
        
        if (reader.close) await reader.close();
      } catch (err: any) {
        console.error('CHM Extraction Error:', err);
        return NextResponse.json({ error: 'Gagal membongkar file CHM: ' + err.message }, { status: 500 });
      }
    } else if (fileName.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const parsed = await pdfParse(buffer);
        const htmlEntryName = fileName.replace(/\.pdf$/i, '.html');

        if (action === 'preview') {
          return NextResponse.json({ success: true, files: [htmlEntryName] });
        }

        console.log(`📄 Mengekstrak teks dari PDF: ${fileName}`);
        const paragraphs = parsed.text
          .split('\n\n')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0)
          .map((p: string) => formatParagraphWithArabic(p))
          .join('\n');

        pendingHtmls.push({ entryName: htmlEntryName, content: paragraphs });
      } catch (err: any) {
        console.error('PDF Extraction Error:', err);
        return NextResponse.json({ error: 'Gagal membongkar file PDF: ' + err.message }, { status: 500 });
      }
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      if (action === 'preview') {
        return NextResponse.json({ success: true, files: [fileName] });
      }
      
      console.log(`🌐 Membaca file HTML langsung: ${fileName}`);
      // Decoding as utf-8 (assuming HTML is utf-8, fallback if necessary)
      const textContent = buffer.toString('utf-8');
      pendingHtmls.push({ entryName: fileName, content: textContent });
    }

    // Fase 2: Proses HTML yang sudah dikumpulkan dengan Cheerio
    const cheerio = await import('cheerio');
    
    for (const item of pendingHtmls) {
      const $ = cheerio.load(item.content);
      
      // Hapus tag yang tidak diperlukan (css, javascript, meta) agar tidak bocor ke teks
      $('script, style, meta, link, noframes, noscript').remove();

      // Ganti URL gambar jika ada yang cocok di Map
      $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          const srcNameOnly = src.split('/').pop()?.toLowerCase() || '';
          if (imageUrlMap.has(srcNameOnly)) {
            $(el).attr('src', imageUrlMap.get(srcNameOnly));
          }
        }
      });
      
      const finalHtml = $.html();
      
      let cleanText = $.text().replace(/\s+/g, ' ').trim();
      let overrideJudul = null;

      // Smart parsing untuk struktur Kitab-9-Imam.chm
      const chmTitle = $('#winchm_template_title').text().trim();
      if (chmTitle) {
        overrideJudul = chmTitle;
      } else {
        const headTitle = $('head title').text().trim();
        if (headTitle) overrideJudul = headTitle;
      }

      // Mengambil bagian terjemahan (indo) dan arab
      const indoHtml = $('#indo').html() || '';
      const indoText = $('#indo').text().replace(/\s+/g, ' ').trim();
      
      const arabHtml = $('#arab, #Harab').html() || '';
      const arabText = $('#arab, #Harab').text().replace(/\s+/g, ' ').trim();

      if (indoText) {
        cleanText = (overrideJudul || '') + '\n\n' + indoText;
        if (arabText) cleanText += '\n\n' + arabText;
      }
      
      const fileNameOnly = item.entryName.split('/').pop() || item.entryName;
      const baseName = fileNameOnly.replace(/\.html?$/i, '');
      const parsed = parseFilename(baseName);
      const id = parsed.id;
      const tahun = parsed.tahun;
      const slug = parsed.slug;
      const judul = overrideJudul || parsed.judul;

      const { error: upsertError, data: upsertData } = await supabase.from(contentTable).upsert(
        { 
          id, 
          tahun, 
          judul, 
          slug, 
          konten: finalHtml, 
          teks_bersih: cleanText, 
          folder_id: folderId,
          // Menambahkan kolom spesifik untuk pencarian
          teks_arab: arabText || null,
          terjemahan: indoText || null
        },
        { onConflict: 'id' }
      ).select();

      console.log(`Upserting ${id} to ${contentTable}. Error:`, upsertError, `Data length:`, upsertData?.length);

      if (upsertError) {
        extractResults.push({ file: baseName, status: 'error', message: upsertError.message });
      } else {
        successCount++;
        extractResults.push({ file: baseName, status: 'success' });
      }
    }

    if (successCount === 0 && extractResults.length === 0) {
       return NextResponse.json({ error: 'Tidak ditemukan file .html di dalam arsip ini.' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengekstrak ${successCount} brosur ke dalam database.`,
      details: extractResults
    });
    
  } catch (error: any) {
    console.error('Error during extraction:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal saat mengekstrak.' }, { status: 500 });
  }
}

// Helper untuk memecah nama file
function parseFilename(baseName: string) {
  let tahun = new Date().getFullYear();
  let judul = baseName;
  let id = baseName;
  
  // Coba pola 1: YYYY-MM-DD_TEXT_judul (Misal: 2022-12-04_20221204_tasyabbuh-3)
  const match1 = baseName.match(/^(\d{4})-(.*?)_(.*)$/);
  // Coba pola 2: YYYYMMDD-judul (Misal: 20221225-muhaasabah)
  const match2 = baseName.match(/^(\d{8})-(.*)$/);
  // Coba pola 3: YYYY-MM-DD-judul
  const match3 = baseName.match(/^(\d{4}-\d{2}-\d{2})-(.*)$/);

  if (match1) {
    tahun = parseInt(match1[1], 10);
    id = match1[1] + '-' + match1[2]; 
    judul = match1[3].replace(/[_]/g, ' '); 
  } else if (match2) {
    tahun = parseInt(match2[1].substring(0, 4), 10);
    id = match2[1];
    judul = match2[2].replace(/[-_]/g, ' ');
  } else if (match3) {
    tahun = parseInt(match3[1].substring(0, 4), 10);
    id = match3[1];
    judul = match3[2].replace(/[-_]/g, ' ');
  } else {
    const yearMatch = baseName.match(/(\d{4})/);
    if (yearMatch) {
      tahun = parseInt(yearMatch[1], 10);
    }
    judul = baseName.replace(/[-_]/g, ' ');
  }

  // Bersihkan id dan judul untuk slug
  const cleanId = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const cleanJudul = judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  // Gabungkan slug tanpa duplikasi (jika cleanId sama dengan cleanJudul, cukup pakai salah satu)
  let rawSlug = '';
  if (cleanId === cleanJudul) {
    rawSlug = cleanJudul;
  } else if (cleanJudul.includes(cleanId)) {
    rawSlug = cleanJudul;
  } else {
    rawSlug = `${cleanId}-${cleanJudul}`;
  }
  
  // Hapus dobel strip jika ada, dan pastikan tidak terlalu panjang
  const slug = rawSlug.replace(/-+/g, '-').replace(/(^-|-$)+/g, '');
  
  return { id, tahun, judul: judul.trim(), slug };
}

// Helper untuk mendecode buffer HTML dengan aman (mendukung charset Windows-1256/1252 & ISO Arabic)
function decodeHtmlBuffer(buffer: Buffer): string {
  const preview = buffer.toString('ascii', 0, Math.min(buffer.length, 2048));
  let charset = 'utf8';
  
  const charsetMatch = preview.match(/charset=["']?([a-zA-Z0-9-]+)["']?/i);
  if (charsetMatch) {
    charset = charsetMatch[1].toLowerCase();
    // Normalisasi nama charset agar dikenali iconv-lite
    if (charset === 'windows-1256') charset = 'win1256';
    if (charset === 'windows-1252') charset = 'win1252';
    if (charset === 'iso-8859-6' || charset === 'iso-8859-6-i' || charset === 'iso-8859-6-e') charset = 'iso-8859-6';
  }

  try {
    if (iconv.encodingExists(charset)) {
       return iconv.decode(buffer, charset);
    }
  } catch(e) {
    console.error('Gagal decode dengan charset meta:', charset);
  }

  // Heuristic Fallback
  const encodings = ['utf8', 'win1256', 'iso-8859-6'];
  let bestStr = '';
  let minBroken = Infinity;

  for (const enc of encodings) {
    let str = '';
    if (enc === 'utf8') {
      str = buffer.toString('utf8');
    } else {
      str = iconv.decode(buffer, enc);
    }
    const brokenCount = (str.match(/\uFFFD/g) || []).length;
    
    if (brokenCount === 0) {
      return str; // Perfect match
    }
    
    if (brokenCount < minBroken) {
      minBroken = brokenCount;
      bestStr = str;
    }
  }
  
  return bestStr;
}
