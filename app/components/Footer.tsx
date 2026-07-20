'use client';

import React, { useState } from 'react';
import { Heart, AlertCircle, CheckCircle2, Coffee, ChevronUp } from 'lucide-react';

export default function Footer() {
  const [showDonasi, setShowDonasi] = useState(false);

  return (
    <footer className="w-full border-t border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/30 backdrop-blur-md mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
        
        {/* Main Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
          <button 
            onClick={() => setShowDonasi(!showDonasi)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-300 ${
              showDonasi 
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20'
            }`}
          >
            <Heart size={18} className={showDonasi ? 'animate-pulse' : ''} />
            Donasi
          </button>
          
          <a href="mailto:brosurmta@gmail.com" className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5 transition-colors">
            <AlertCircle size={18} />
            Laporkan Kesalahan
          </a>
        </div>

        {/* Expandable Donasi Message */}
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out max-w-2xl w-full ${
            showDonasi ? 'max-h-[500px] opacity-100 mb-10' : 'max-h-0 opacity-0 mb-0'
          }`}
        >
          <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 p-8 rounded-3xl border border-rose-100 dark:border-rose-900/50 relative">
            <div className="absolute -top-4 -right-4 text-rose-500/10 dark:text-rose-500/5">
              <Heart size={120} />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-rose-900 dark:text-rose-400 mb-4 relative z-10" style={{ fontFamily: "var(--font-amiri), serif" }}>
              Terkait Donasi...
            </h3>
            <div className="space-y-4 text-rose-800/80 dark:text-rose-200/80 leading-relaxed text-sm md:text-base relative z-10 text-left">
              <p>
                Tidak perlu menyisihkan harta Anda. Jika Anda merasa website arsip ini bermanfaat, <strong>cukup doakan kami</strong> di sela-sela waktu mustajab Anda.
              </p>
              <p>
                Semoga Allah ﷻ menerima upaya kecil yang penuh kekurangan ini, mencatatnya sebagai amal shalih yang kelak memberatkan timbangan kebaikan, serta senantiasa memberikan taufik dan kemudahan pada setiap urusan kita di dunia maupun akhirat.
              </p>
              <div className="h-px w-full bg-rose-200 dark:bg-rose-900/50 my-4"></div>
              <p className="flex items-start gap-3 text-rose-900 dark:text-rose-300 font-medium">
                <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-rose-500" />
                <span>
                  Apabila Anda menemukan kesalahan (baik pada teks maupun sistem), mohon jangan segan untuk mengingatkan kami dengan cara yang ahsan dan sesuai sunnah.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Footer (Bottom Bar) */}
      <div className="w-full border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 py-6 mt-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-zinc-400 text-sm font-medium gap-4">
          <p className="flex items-center gap-2">
            Dibuat untuk mempermudah akses ilmu.
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
            Non-Official
          </p>
          <p>
            &copy; {new Date().getFullYear()} Arsip Digital MTA
          </p>
        </div>
      </div>
    </footer>
  );
}
