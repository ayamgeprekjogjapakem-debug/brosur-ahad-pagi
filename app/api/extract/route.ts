import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName || (!fileName.endsWith('.zip') && !fileName.endsWith('.chm'))) {
      return NextResponse.json({ error: 'File tidak valid atau bukan file .zip / .chm.' }, { status: 400 });
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
      console.log(`📦 Ditemukan ${zipEntries.length} entries di dalam ZIP.`);
      
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        const entryName = entry.entryName;
        const lowerName = entryName.toLowerCase();
        
        const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm');
        const isImage = imageExtensions.some(ext => lowerName.endsWith(ext));

        if (isHtml) {
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
        
        console.log(`📦 Membuka file CHM...`);
        for await (const ui of chmFile.enumerate(31)) {
          const entryName = ui.path;
          const lowerName = entryName.toLowerCase();
          
          const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm');
          const isImage = imageExtensions.some(ext => lowerName.endsWith(ext));

          if (isHtml) {
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
    }

    // Fase 2: Proses HTML yang sudah dikumpulkan dengan Cheerio
    const cheerio = await import('cheerio');
    
    for (const item of pendingHtmls) {
      const $ = cheerio.load(item.content);
      
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
      
      const fileNameOnly = item.entryName.split('/').pop() || item.entryName;
      const baseName = fileNameOnly.replace(/\.html?$/i, '');
      const { id, tahun, judul, slug } = parseFilename(baseName);

      const { error: upsertError } = await supabase.from('brosur').upsert(
        { id, tahun, judul, slug, konten: finalHtml },
        { onConflict: 'id' }
      );

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

  // Gabungkan slug tanpa duplikasi (jika judul sudah mengandung ID)
  let rawSlug = `BAP-(Brosur-Ahad-Pagi)-${tahun}-${cleanId}-${cleanJudul}`;
  
  // Hapus dobel strip jika ada
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
  const utf8Str = buffer.toString('utf8');
  const brokenCharsCount = utf8Str.split('').length - 1;
  
  // Jika UTF-8 menghasilkan banyak karakter aneh, coba decoding dengan format Arabic/Windows
  if (brokenCharsCount > 5) {
    // Kita coba decode sebagai windows-1256 (yang paling umum untuk Arab/Indonesia lama)
    const winStr = iconv.decode(buffer, 'win1256');
    // Jika masih ada huruf aneh di win1256, kita coba iso-8859-6
    if (winStr.includes('')) {
      return iconv.decode(buffer, 'iso-8859-6');
    }
    return winStr;
  }
  
  return utf8Str;
}
