import React, { Suspense } from 'react';
import { AlignLeft, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import HighlightClient from './HighlightClient';
import SettingsPopover from './SettingsPopover';
import CollectionSidebar from './CollectionSidebar';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Brosur ${decodeURIComponent(resolvedParams.slug)}`,
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
    // Ambil daftar brosur dalam 1 koleksi saja
    const { data: list } = await supabase
      .from('brosur')
      .select('judul, slug, tahun')
      .eq('folder_id', brosur.folder_id)
      .order('tahun', { ascending: false })
      .limit(10000);
    if (list) brosurList = list;
    
    // Ambil slug folder untuk tombol kembali
    const { data: folder } = await supabase
      .from('folders')
      .select('slug')
      .eq('id', brosur.folder_id)
      .single();
    if (folder) folderSlug = folder.slug;
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
    <div className="h-[100dvh] flex flex-col lg:flex-row w-full relative overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]">
      
      {/* Sidebar Daftar Brosur (Client Component dengan Suspense) */}
      <Suspense fallback={<div className="w-[320px] bg-white dark:bg-zinc-900 border-r border-black/5 dark:border-white/5" />}>
        <CollectionSidebar 
          brosurList={brosurList} 
          activeSlug={brosur.slug} 
          folderSlug={folderSlug} 
          folderId={brosur.folder_id}
        />
      </Suspense>

      {/* Area Konten Utama */}
      <main className="flex-1 h-[100dvh] flex flex-col relative bg-white dark:bg-[#111]">
        <header className="p-6 md:p-10 pb-6 border-b border-black/5 dark:border-white/5 relative bg-white/50 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="absolute top-6 right-6 md:top-10 md:right-10 flex items-center gap-2">
            <SettingsPopover />
          </div>

          <div className="flex items-center gap-2 text-accent text-xs font-extrabold mb-3 uppercase tracking-widest">
            <AlignLeft size={14} /> Tahun {brosur.tahun}
          </div>
          
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            {brosur.judul}
          </h1>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar relative">
          <div className="max-w-3xl mx-auto">
            <HighlightClient brosur={brosur} />
            
            {/* Fitur Debugging: Tampilkan HTML mentah jika UI kosong */}
            <details className="mt-16 text-xs font-mono bg-black/5 dark:bg-white/5 p-4 rounded-xl text-zinc-500">
              <summary className="cursor-pointer font-bold hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">Lihat HTML Mentah (Jika teks artikel tidak muncul)</summary>
              <pre className="whitespace-pre-wrap mt-4 opacity-70 break-all bg-white dark:bg-black p-4 rounded-lg border border-black/10 dark:border-white/10">{brosur.konten}</pre>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}
