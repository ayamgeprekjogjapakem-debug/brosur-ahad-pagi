import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { formatParagraphWithArabic } from '@/utils/arabic-normalizer';
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileName = body.fileName;

    if (!fileName || !fileName.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File tidak valid atau bukan file .pdf.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verifikasi Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Download pdf dari Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage.from('chm-uploads').download(fileName);
    
    if (downloadError || !fileData) {
      console.error('Download Error:', downloadError);
      return NextResponse.json({ error: 'Gagal mengunduh file dari Storage.' }, { status: 500 });
    }

    // 3. Ekstrak text dari buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const parsed = await pdfParse(buffer);
    
    // Convert to normalized HTML paragraphs with Arabic support
    const paragraphs = parsed.text
      .split('\n\n')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0)
      .map((p: string) => formatParagraphWithArabic(p))
      .join('\n');

    return NextResponse.json({ 
      success: true, 
      text: parsed.text,
      html: paragraphs
    });
    
  } catch (error: any) {
    console.error('Error during PDF parsing:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal saat mengekstrak teks PDF.' }, { status: 500 });
  }
}
