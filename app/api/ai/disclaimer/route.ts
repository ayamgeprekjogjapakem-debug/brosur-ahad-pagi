import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('ai_disclaimer')
      .eq('id', 1)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      disclaimer: data.ai_disclaimer 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
