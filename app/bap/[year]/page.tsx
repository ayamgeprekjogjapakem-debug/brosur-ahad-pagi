import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft, ScrollText, Calendar } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import MainSidebar from '../../components/MainSidebar';


export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return {
    title: `Brosur MTA Tahun ${year} | Arsip Ahad Pagi`,
    description: `Daftar lengkap Brosur Ahad Pagi MTA (Majlis Tafsir Al-Qur'an) terbitan tahun ${year}.`,
  };
}

export default async function BrosurYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const supabase = await createClient();

  // Fetch brosurs for this specific year from Supabase
  const { data: brosurs, error } = await supabase
    .from('brosur')
    .select('id, judul, slug, tahun')
    .eq('tahun', parseInt(year))
    .order('judul', { ascending: true });

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      {/* Sidebar - using hidden on mobile, assuming HeaderBar handles mobile toggle if needed, or we just rely on navigation */}
      <MainSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-16 border-b border-slate-100 flex items-center px-4 bg-white shrink-0 sticky top-0 z-10">
          <Link href="/bap" className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition mr-4">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-300">/</span>
            <Link href="/bap" className="text-sm font-semibold text-slate-500 hover:text-emerald-700 transition">Brosur</Link>
            <span className="text-sm font-semibold text-slate-300">/</span>
            <span className="text-sm font-semibold text-emerald-700 tracking-wide">Tahun {year}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-5xl mx-auto pb-20">
            <div className="flex flex-col items-center justify-center py-6 mb-8 border-b border-slate-100 pb-10">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-5 shadow-sm">
                <Calendar size={28} />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight text-center">
                Brosur Tahun <span className="text-emerald-600">{year}</span>
              </h1>
              <p className="text-slate-500 mt-3 text-base text-center max-w-md font-medium">
                Ditemukan {brosurs?.length || 0} kajian Ahad Pagi pada tahun ini.
              </p>
            </div>

            {error ? (
              <div className="text-center py-12 text-rose-500 font-medium">
                Gagal memuat data dari database.
              </div>
            ) : brosurs && brosurs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brosurs.map((brosur) => {
                  // Sempurnakan slug: buat slug bersih dari judul
                  const cleanSlug = brosur.judul
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                  return (
                    <Link 
                      href={`/bap/${brosur.tahun}/${cleanSlug}`} 
                      key={brosur.id}
                      className="group bg-white border border-slate-200 p-5 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all flex items-start gap-4"
                    >
                      <div className="w-10 h-10 shrink-0 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors rounded-xl flex items-center justify-center mt-0.5">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-[15px] group-hover:text-emerald-700 leading-snug line-clamp-3">
                          {brosur.judul}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                          Pustaka MTA
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 flex flex-col items-center">
                <ScrollText className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-lg font-medium text-slate-600">Belum ada data brosur</p>
                <p className="text-sm mt-1">Tidak ada brosur yang diterbitkan atau diarsipkan untuk tahun {year}.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
