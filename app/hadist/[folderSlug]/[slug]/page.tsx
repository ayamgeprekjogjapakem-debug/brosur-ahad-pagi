'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { 
  ArrowLeft, BookOpen, Loader2, Calendar, FolderArchive, FileText, Book, Menu
} from 'lucide-react';
import Image from 'next/image';
import MainSidebar from '@/app/components/MainSidebar';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';
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
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      
      {/* Sidebar Global */}
      <MainSidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-main-sidebar'))}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition shadow-sm"
              title="Toggle Sidebar Menu"
            >
              <Menu size={18} />
            </button>

            <Link 
              href={`/hadist/${resolvedParams.folderSlug}`} 
              className="text-xs font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Kitab</span>
            </Link>
          </div>

          <HeaderUserDropdown />
        </header>

        {/* Content Wrapper */}
        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full pb-20">
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200">
            
            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-100">
                <FolderArchive className="w-3.5 h-3.5" />
                {hadist.folders_hadist?.name?.replace(/^HADIST_/i, '') || 'Koleksi Kitab'}
              </span>
              {hadist.id && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  ID: {hadist.id}
                </span>
              )}
              {hadist.tahun && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider border border-amber-200">
                  <Calendar className="w-3.5 h-3.5" />
                  {hadist.tahun}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight mb-8">
              {hadist.judul || 'Hadist'}
            </h1>
            
            {/* Teks Arab */}
            {hadist.teks_arab ? (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Book className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Matan Hadist</h3>
                </div>
                <p 
                  className="text-right text-[26px] md:text-[30px] leading-[2.2] md:leading-[2.5] text-slate-900" 
                  dir="rtl"
                  style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', serif" }}
                >
                  {hadist.teks_arab}
                </p>
              </div>
            ) : hadist.teks_bersih && !hadist.konten && (
              <div className="mb-8">
                <p 
                  className="text-right text-[26px] md:text-[30px] leading-[2.2] md:leading-[2.5] text-slate-900" 
                  dir="rtl"
                  style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', serif" }}
                >
                  {hadist.teks_bersih}
                </p>
              </div>
            )}

            {/* Terjemahan */}
            {hadist.terjemahan ? (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Terjemahan</h3>
                </div>
                <div className="text-slate-700 text-base leading-relaxed max-w-none">
                  "{hadist.terjemahan}"
                </div>
              </div>
            ) : (
              hadist.konten && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">Isi & Terjemahan Lengkap</h3>
                  </div>
                  <div 
                    className="text-slate-700 text-base leading-relaxed max-w-none prose prose-slate prose-emerald"
                    dangerouslySetInnerHTML={{ __html: hadist.konten }}
                  />
                </div>
              )
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
