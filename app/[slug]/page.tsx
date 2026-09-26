import React from 'react';
import { AlignLeft, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import HighlightClient from './HighlightClient';
import SettingsPopover from './SettingsPopover';
import HeaderBar from './HeaderBar';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);
  const searchSlug = slug.replace('BAP-(Brosur-Ahad-Pagi)-', '').trim();
  
  const supabase = await createClient();
  const { data: brosur } = await supabase
    .from('brosur')
    .select('judul, slug')
    .ilike('slug', `%${searchSlug}%`)
    .limit(1)
    .maybeSingle();

  if (!brosur) {
    return {
      title: 'Brosur Tidak Ditemukan',
    };
  }

  return {
    title: brosur.judul,
    description: `Baca penjelasan, dalil, dan kajian mengenai ${brosur.judul} berdasarkan pemahaman dari Brosur Ahad Pagi MTA (Majlis Tafsir Al-Qur'an).`,
    keywords: [brosur.judul, 'brosur mta', 'kajian mta', 'ahad pagi mta', 'majlis tafsir al quran', 'zakat mta', 'sholat mta'],
    openGraph: {
      title: `${brosur.judul} | Brosur MTA Digital`,
      description: `Baca penjelasan, dalil, dan kajian mengenai ${brosur.judul} dari Brosur Ahad Pagi MTA.`,
    },
  };
}
export default async function BrosurPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);
  const supabase = await createClient();
  
  // Buat query yang sangat longgar untuk menghindari masalah karakter khusus / spasi tersembunyi
  const searchSlug = slug.replace('BAP-(Brosur-Ahad-Pagi)-', '').trim();
  
  const { data: brosur } = await supabase
    .from('brosur')
    .select('*')
    .ilike('slug', `%${searchSlug}%`)
    .limit(1)
    .maybeSingle();

  let brosurList: any[] = [];
  let folderSlug = '';
  
  if (brosur && brosur.folder_id) {
    // Info folder tidak lagi dibutuhkan di halaman ini
  }
    
  console.log("URL DIBUKA:", resolvedParams.slug);
  console.log("DECODED SLUG:", slug);
  console.log("SEARCH STRING:", searchSlug);
  console.log("HASIL DB:", brosur ? "KETEMU: " + brosur.judul : "TIDAK KETEMU");
  
  if (!brosur) {
    // Debugging: ambil beberapa slug dari database untuk dicocokkan
    const { data: allBrosurs } = await supabase.from('brosur').select('slug').limit(5);
    
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center text-zinc-500 overflow-auto">
        <h2 className="text-2xl font-bold mb-4">Brosur tidak ditemukan</h2>
        <div className="bg-zinc-100 dark:bg-zinc-900 p-6 rounded-xl text-left text-xs font-mono mb-8 max-w-full overflow-x-auto">
          <p className="text-red-500 font-bold mb-2">DEBUG INFO:</p>
          <p><strong>Target URL:</strong> {resolvedParams.slug}</p>
          <p><strong>Decoded URL:</strong> {slug}</p>
          <p><strong>Fuzzy Search:</strong> %{searchSlug}%</p>
          <p className="mt-4 font-bold">Contoh Slug yang ada di Database (Top 5):</p>
          <ul className="list-disc pl-5 mt-2">
            {allBrosurs?.map(b => (
              <li key={b.slug} className="mb-1">{b.slug}</li>
            ))}
          </ul>
        </div>
        <Link href="/" className="btn-apple bg-accent text-white px-6 py-3 rounded-full flex items-center gap-2">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <main className="flex-1 h-[100dvh] print:h-auto flex flex-col relative bg-white dark:bg-[#111]">
      <HeaderBar />
      
      <div className="flex-1 overflow-y-auto print:overflow-visible p-6 md:p-12 print:p-0 custom-scrollbar relative">
        <div className="max-w-3xl mx-auto pb-12 print:pb-0">
          
          {/* Title Area */}
          <div className="text-center flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] md:text-xs font-extrabold mb-2 uppercase tracking-widest">
              <AlignLeft size={14} /> Tahun {brosur.tahun}
            </div>
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight leading-snug text-slate-900">
              {brosur.judul}
            </h1>
          </div>

          <HighlightClient brosur={brosur} />
        </div>
      </div>
    </main>
  );
}
