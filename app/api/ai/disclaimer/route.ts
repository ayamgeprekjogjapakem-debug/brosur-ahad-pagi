import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from('app_settings')
      .select('ai_disclaimer, system_prompt')
      .eq('id', 1)
      .single();

    const disclaimerText = settings?.ai_disclaimer || 
      '• AI Sahabat MTA adalah asisten telaah dalil dan penelusuran materi Brosur Ahad Pagi MTA.\n\n' +
      '• Sumber rujukan utama dan mutlak tetap pada Al-Qur\'an dan As-Sunnah ash-Shahihah.\n\n' +
      '• Ingatlah untuk mencatat karena "mengikat ilmu dengan tulisan".\n\n' +
      '• Jika menemukan data atau telaah yang perlu dikoreksi, harap hubungi admin pustaka.';

    return NextResponse.json({
      success: true,
      disclaimer: disclaimerText,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      disclaimer: 
        '• AI Sahabat MTA adalah asisten telaah dalil dan penelusuran materi Brosur Ahad Pagi MTA.\n\n' +
        '• Sumber rujukan utama dan mutlak tetap pada Al-Qur\'an dan As-Sunnah ash-Shahihah.\n\n' +
        '• Ingatlah untuk mencatat karena "mengikat ilmu dengan tulisan".\n\n' +
        '• Jika menemukan data atau telaah yang perlu dikoreksi, harap hubungi admin pustaka.',
    });
  }
}

