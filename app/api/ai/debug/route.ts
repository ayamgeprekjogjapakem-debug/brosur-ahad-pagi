import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export async function GET() {
  const testId = "test_" + Date.now();
  
  // Insert
  const { data: insData, error: insErr } = await supabase.from('brosur_chunks').insert({
    brosur_id: testId,
    judul_brosur: "Test Judul",
    content: "Test Content"
  }).select();
  
  // Select without returning
  const { data: selData, error: selErr } = await supabase.from('brosur_chunks').select('*').eq('brosur_id', testId);
  
  // Select all
  const { data: allData, error: allErr } = await supabase.from('brosur_chunks').select('*').limit(5);

  return NextResponse.json({
    insert: { data: insData, error: insErr },
    selectAfter: { data: selData, error: selErr },
    selectAll: { data: allData, error: allErr }
  });
}
