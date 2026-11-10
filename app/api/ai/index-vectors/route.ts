import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { chunkBrosurText, generateGoogleEmbedding } from '@/utils/ai-embeddings';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Hitung total brosur
    const { count: totalBrosur } = await supabase
      .from('brosur')
      .select('id', { count: 'exact', head: true });

    // 2. Cek apakah tabel brosur_chunks sudah dibuat di Supabase
    const { count: totalChunks, error: chunkErr } = await supabase
      .from('brosur_chunks')
      .select('id', { count: 'exact', head: true });

    if (chunkErr) {
      return NextResponse.json({
        success: true,
        tableExists: false,
        totalBrosur: totalBrosur || 0,
        totalChunks: 0,
        embeddedChunks: 0,
        message: 'Tabel brosur_chunks belum dibuat. Jalankan SQL scripts/setup_hybrid_pgvector.sql di Supabase.',
      });
    }

    const { count: embeddedChunks } = await supabase
      .from('brosur_chunks')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    return NextResponse.json({
      success: true,
      tableExists: true,
      totalBrosur: totalBrosur || 0,
      totalChunks: totalChunks || 0,
      embeddedChunks: embeddedChunks || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const offset = Number(body.offset || 0);
    const batchSize = Math.min(Number(body.batchSize || 10), 25);
    const withEmbedding = body.withEmbedding !== false;

    // Ambil Google AI Token dari app_settings untuk text-embedding-004
    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    const googleKey = settings?.google_ai_token || process.env.GOOGLE_AI_API_KEY;

    // Ambil batch brosur dari 1995-2026
    const { data: brosurs, error: brosurErr } = await supabase
      .from('brosur')
      .select('id, judul, tahun, folder_id, konten, teks_bersih')
      .order('tahun', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (brosurErr) {
      return NextResponse.json({ success: false, error: brosurErr.message }, { status: 500 });
    }

    if (!brosurs || brosurs.length === 0) {
      return NextResponse.json({
        success: true,
        processedBrosur: 0,
        createdChunks: 0,
        embeddedChunks: 0,
        hasMore: false,
        nextOffset: offset,
      });
    }

    let createdChunksCount = 0;
    let embeddedChunksCount = 0;

    for (const b of brosurs) {
      const sourceText = b.konten || b.teks_bersih || '';
      const chunks = chunkBrosurText(sourceText, 1200);
      if (chunks.length === 0) continue;

      // Bersihkan chunk lama untuk brosur_id ini agar tidak duplikat
      await supabase.from('brosur_chunks').delete().eq('brosur_id', String(b.id));

      const rowsToInsert: any[] = [];

      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkText = chunks[idx];
        let embedding: number[] | null = null;

        if (withEmbedding && googleKey) {
          embedding = await generateGoogleEmbedding(`${b.judul || ''} (${b.tahun || ''})\n${chunkText}`, googleKey);
          if (embedding) embeddedChunksCount++;
        }

        const row: any = {
          brosur_id: String(b.id),
          judul_brosur: b.judul || 'Brosur MTA',
          tahun: b.tahun || null,
          folder_id: b.folder_id || null,
          content: chunkText,
          metadata: { chunk_index: idx, total_chunks: chunks.length },
        };

        if (embedding) {
          row.embedding = `[${embedding.join(',')}]`;
        }

        rowsToInsert.push(row);
      }

      if (rowsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('brosur_chunks')
          .insert(rowsToInsert);

        if (insertErr) {
          return NextResponse.json({
            success: false,
            error: `Gagal menyimpan ke brosur_chunks: ${insertErr.message}. Pastikan scripts/setup_hybrid_pgvector.sql sudah dijalankan di Supabase.`,
          }, { status: 400 });
        }

        createdChunksCount += rowsToInsert.length;
      }
    }

    return NextResponse.json({
      success: true,
      processedBrosur: brosurs.length,
      createdChunks: createdChunksCount,
      embeddedChunks: embeddedChunksCount,
      hasMore: brosurs.length === batchSize,
      nextOffset: offset + brosurs.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
