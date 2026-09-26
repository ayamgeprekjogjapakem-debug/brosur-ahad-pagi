'use client';

import React from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HeaderBar() {
  const router = useRouter();
  return (
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10 w-full shrink-0">
      <div className="flex items-center gap-4">
        {/* Menu Button to toggle collection sidebar */}
        <button 
          onClick={() => window.dispatchEvent(new Event('toggle-collection-sidebar'))}
          className="lg:hidden w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
          title="Buka Daftar Brosur"
        >
          <Menu size={18} />
        </button>

        {/* Kembali Button */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
      </div>
      
      {/* Profile Pill */}
      <div>
        <div className="px-3 py-1.5 border border-slate-200 rounded-full flex items-center gap-2">
           <span className="text-xs font-bold text-slate-600 hidden sm:inline-block">Guru Daerah MTA</span>
           <span className="text-xs font-bold text-slate-600 sm:hidden">Guru MTA</span>
           <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[8px] font-bold text-emerald-700">GD</div>
        </div>
      </div>
    </div>
  );
}
