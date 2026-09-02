import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('app_settings')
    .update({ system_prompt: 'Gunakan gaya bahasa santun, poin-poin terstruktur, dan huruf tebal untuk menyorot dalil penting.' })
    .eq('id', 1)
    .select();

  if (error) {
    return NextResponse.json({ success: false, error });
  }

  return NextResponse.json({ success: true, data });
}
