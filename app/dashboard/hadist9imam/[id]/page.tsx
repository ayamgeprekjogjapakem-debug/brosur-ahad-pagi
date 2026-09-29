'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, Book, Calendar, FolderArchive, FileText } from 'lucide-react';
import Link from 'next/link';

export default function HadistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;

  const [hadist, setHadist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchHadist = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('hadist_chm')
          .select('*, folders_hadist(name)')
          .eq('id', id)
          .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Data tidak ditemukan");
        
        setHadist(data[0]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Hadist tidak ditemukan');
      } finally {
        setLoading(false);
      }
    };

    fetchHadist();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-[#fbfbfd]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-zinc-500 font-medium">Memuat detail hadist...</p>
      </div>
    );
  }

  if (error || !hadist) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-[#fbfbfd]">
        <Book className="w-16 h-16 text-zinc-300 mb-4" />
        <h2 className="text-2xl font-semibold text-zinc-800 mb-2">Oops, Terjadi Kesalahan</h2>
        <p className="text-zinc-500 mb-6">{error || 'Data tidak ditemukan'}</p>
        <Link 
          href="/dashboard/hadist9imam"
          className="px-6 py-2.5 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition-colors shadow-md"
        >
          Kembali ke Koleksi
        </Link>
      </div>
    );
  }

  const renderChmPills = (id: string) => {
    const match = id.match(/^H(\d+)K(\d+)(?:B(\d+))?/i);
    if (match) {
      const buku = match[1];
      const kitab = parseInt(match[2], 10);
      const hadistNo = match[3] ? parseInt(match[3], 10) : null;
      return (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-wider border border-zinc-200">
            Buku {buku} • Kitab {kitab}
          </span>
          {hadistNo && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider border border-emerald-100">
              Hadist No. {hadistNo}
            </span>
          )}
        </>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-wider border border-zinc-200">
        ID: {id}
      </span>
    );
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#fbfbfd] p-6 md:p-10 selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto">
        {/* Navigation & Breadcrumbs */}
        <div className="mb-8">
          <Link 
            href="/dashboard/hadist9imam"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-500 hover:text-emerald-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Koleksi
          </Link>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider border border-emerald-100">
              <FolderArchive className="w-3.5 h-3.5" />
              {hadist.folders_hadist?.name || 'Koleksi Umum'}
            </span>
            {renderChmPills(hadist.id)}
            {hadist.tahun && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider border border-amber-200">
                <Calendar className="w-3.5 h-3.5" />
                {hadist.tahun}
              </span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight">
            {hadist.judul || 'Hadist Tanpa Judul'}
          </h1>
        </div>

        {/* Content Area - Glassmorphism Card */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03]">
          
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
            // Fallback for old data
            <div className="mb-10">
              <p className="font-arabic text-3xl md:text-4xl leading-[2.5] md:leading-[2.8] text-right text-zinc-900" dir="rtl">
                {hadist.teks_bersih}
              </p>
            </div>
          )}

          {/* Terjemahan (Jika ada yang dipisah) */}
          {hadist.terjemahan ? (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-zinc-600" />
                </div>
                <h3 className="font-semibold text-zinc-800 text-lg">Terjemahan</h3>
              </div>
              <div className="text-zinc-600 text-lg leading-relaxed prose prose-emerald max-w-none">
                {hadist.terjemahan}
              </div>
            </div>
          ) : (
            // Fallback to full HTML content
            hadist.konten && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-zinc-600" />
                  </div>
                  <h3 className="font-semibold text-zinc-800 text-lg">Isi & Terjemahan Lengkap</h3>
                </div>
                <div 
                  className="text-zinc-600 text-lg leading-relaxed prose prose-emerald max-w-none"
                  dangerouslySetInnerHTML={{ __html: hadist.konten }}
                />
              </div>
            )
          )}
          
        </div>
      </div>
    </div>
  );
}
