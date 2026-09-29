'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { 
  ArrowLeft, BookOpen, Loader2, Calendar, FolderArchive, FileText, Book
} from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function PublicHadistDetailPage({ params }: { params: Promise<{ folderSlug: string, slug: string }> }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  
  const [hadist, setHadist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHadist = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('hadist_chm')
          .select('*, folders_hadist(name, slug)')
          .or(`slug.eq.${slug},id.ilike.${slug}`)
          .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Hadist tidak ditemukan");
        
        setHadist(data[0]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Hadist tidak ditemukan');
      } finally {
        setLoading(false);
      }
    };

    fetchHadist();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-zinc-500 font-medium">Membuka kitab...</p>
        </div>
      </div>
    );
  }

  if (error || !hadist) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center">
          <Book className="w-16 h-16 text-zinc-300 mb-4" />
          <h2 className="text-2xl font-semibold text-zinc-800 mb-2">Tidak Ditemukan</h2>
          <p className="text-zinc-500 mb-6">{error || 'Data tidak ditemukan di perpustakaan kami'}</p>
          <Link 
            href="/hadist"
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-colors shadow-md"
          >
            Kembali ke Pencarian
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* HEADER */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-zinc-200/80 bg-white/80 backdrop-blur-2xl sticky top-0 z-50 transition-all">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Image 
              src="/logo.png" 
              alt="Logo Ulil Albab" 
              fill
              className="object-contain"
            />
          </div>
          <span className="font-bold text-[17px] tracking-tight text-zinc-900 hidden sm:block">Ulil Albab</span>
        </Link>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:px-8 md:py-12">
        <Link href="/hadist" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-zinc-600 font-bold text-xs hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm mb-8 border border-zinc-200">
          <ArrowLeft size={14} />
          <span>Kembali ke Pencarian</span>
        </Link>

        {/* Content Wrapper */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03]">
          
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider border border-emerald-100">
              <FolderArchive className="w-3.5 h-3.5" />
              {hadist.folders_hadist?.name?.replace(/^HADIST_/i, '') || 'Koleksi Umum'}
            </span>
            {hadist.tahun && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider border border-amber-200">
                <Calendar className="w-3.5 h-3.5" />
                {hadist.tahun}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight mb-12">
            {hadist.judul || 'Hadist Tanpa Judul'}
          </h1>
          
          {/* Teks Arab (Jika ada yang dipisah) */}
          {hadist.teks_arab ? (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Book className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-zinc-800 text-lg">Matan Hadist</h3>
              </div>
              <p className="font-arabic text-3xl md:text-4xl leading-[2.5] md:leading-[2.8] text-right text-zinc-900" dir="rtl">
                {hadist.teks_arab}
              </p>
            </div>
          ) : hadist.teks_bersih && !hadist.konten && (
            <div className="mb-10">
              <p className="font-arabic text-3xl md:text-4xl leading-[2.5] md:leading-[2.8] text-right text-zinc-900" dir="rtl">
                {hadist.teks_bersih}
              </p>
            </div>
          )}

          {/* Terjemahan */}
          {hadist.terjemahan ? (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-zinc-600" />
                </div>
                <h3 className="font-semibold text-zinc-800 text-lg">Terjemahan</h3>
              </div>
              <div className="text-zinc-600 text-lg leading-relaxed max-w-none">
                {hadist.terjemahan}
              </div>
            </div>
          ) : (
            hadist.konten && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-zinc-600" />
                  </div>
                  <h3 className="font-semibold text-zinc-800 text-lg">Isi & Terjemahan Lengkap</h3>
                </div>
                <div 
                  className="text-zinc-600 text-lg leading-relaxed max-w-none prose prose-emerald"
                  dangerouslySetInnerHTML={{ __html: hadist.konten }}
                />
              </div>
            )
          )}
          
        </div>
      </main>
    </div>
  );
}
