'use client';

import React, { useEffect } from 'react';
import MainSidebar from '../components/MainSidebar';
import { Users, Hammer, ArrowRight, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PerawiPage() {
  const router = useRouter();

  // Load MainSidebar on mount so the window event fires
  useEffect(() => {
    // any init logic for perawi
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 font-sans">
      <MainSidebar />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-white/50">
        
        {/* Header Toggle */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.dispatchEvent(new Event('toggle-main-sidebar'))}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition lg:hidden"
              title="Buka Menu Utama"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-300">/</span>
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">Master Perawi</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 border border-slate-200 rounded-full flex items-center gap-2">
               <span className="text-xs font-bold text-slate-600 hidden sm:inline-block">Guru Daerah MTA</span>
               <span className="text-xs font-bold text-slate-600 sm:hidden">Guru MTA</span>
               <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[8px] font-bold text-emerald-700">GD</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          
          {/* Construction Hero */}
          <div className="max-w-3xl mx-auto mt-12 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden text-center relative p-12">
            
            {/* Background elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 -z-10" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50 -z-10" />

            <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <Hammer size={40} className="animate-pulse" />
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Modul <span className="text-emerald-600">Master Perawi</span> Sedang Dibangun
            </h1>
            
            <p className="text-slate-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Halaman ini nantinya akan berfungsi sebagai pusat manajemen data perawi hadist (seperti Bukhari, Muslim, dll) untuk menstandarisasi penulisan nama yang bervariasi dari brosur-brosur lama.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto text-left mb-10">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex gap-4 items-start">
                <Database className="text-emerald-500 mt-1 shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">Standarisasi Nama</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Penyatuan berbagai varian nama (Bukhori, Al-Bukhari) menjadi satu entitas standar resmi.</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex gap-4 items-start">
                <Users className="text-emerald-500 mt-1 shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">Statistik Kutipan</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Analisis dan metrik perawi mana yang paling sering muncul dalam materi brosur.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg hover:shadow-xl"
            >
              Kembali ke Beranda <ArrowRight size={16} />
            </button>
          </div>

        </div>

      </main>
    </div>
  );
}
