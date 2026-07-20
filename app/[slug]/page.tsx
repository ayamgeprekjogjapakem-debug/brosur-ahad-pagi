import React from 'react';
import { AlignLeft, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import HighlightClient from './HighlightClient';
import SettingsPopover from './SettingsPopover';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// generateMetadata dipindahkan ke layout.tsx

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
      <header className="px-6 py-4 border-b border-black/5 dark:border-white/5 relative bg-white/50 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-10 print:hidden">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
          {/* Top Bar (Branding & Settings) */}
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-start">
              {/* Tempat kosong untuk mengimbangi Settings di kanan, 
                  supaya Logo persis di tengah */}
            </div>
            
            <Link href="/" className="flex items-center justify-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Logo Ulil Albab" 
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <span className="font-extrabold text-lg tracking-tight">Ulil Albab</span>
            </Link>
            
            <div className="flex-1 flex items-center justify-end gap-2">
              <SettingsPopover />
            </div>
          </div>

          {/* Title Area */}
          <div className="text-center flex flex-col items-center">
            <div className="flex items-center gap-2 text-accent text-[10px] md:text-xs font-extrabold mb-2 uppercase tracking-widest">
              <AlignLeft size={14} /> Tahun {brosur.tahun}
            </div>
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight leading-snug">
              {brosur.judul}
            </h1>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto print:overflow-visible p-6 md:p-12 print:p-0 custom-scrollbar relative">
        <div className="max-w-3xl mx-auto pb-12 print:pb-0">
          <HighlightClient brosur={brosur} />
        </div>
      </div>
    </main>
  );
}
