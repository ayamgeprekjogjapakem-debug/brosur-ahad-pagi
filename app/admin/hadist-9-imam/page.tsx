'use client';

import React, { useState, useEffect } from 'react';
import { 
  Library, Search, BookOpen, ExternalLink, ArrowUpRight, 
  Layers, ShieldCheck, CheckCircle2, ChevronRight, Loader2
} from 'lucide-react';
import Link from 'next/link';

export const NINE_BOOKS = [
  { key: 'H1', slug: 'shahih-bukhari', label: 'Shahih Bukhari', short: 'Bukhari', bookNo: 1, compiler: 'Imam Bukhari (194 - 256 H)', totalHadist: '7.008' },
  { key: 'H2', slug: 'shahih-muslim', label: 'Shahih Muslim', short: 'Muslim', bookNo: 2, compiler: 'Imam Muslim (204 - 261 H)', totalHadist: '5.362' },
  { key: 'H3', slug: 'sunan-abu-daud', label: 'Sunan Abu Daud', short: 'Abu Daud', bookNo: 3, compiler: 'Imam Abu Daud (202 - 275 H)', totalHadist: '4.590' },
  { key: 'H4', slug: 'sunan-tirmidzi', label: 'Sunan Tirmidzi', short: 'Tirmidzi', bookNo: 4, compiler: 'Imam Tirmidzi (209 - 279 H)', totalHadist: '3.891' },
  { key: 'H5', slug: 'sunan-nasai', label: 'Sunan Nasa\'i', short: 'Nasa\'i', bookNo: 5, compiler: 'Imam Nasa\'i (215 - 303 H)', totalHadist: '5.662' },
  { key: 'H6', slug: 'sunan-ibnu-majah', label: 'Sunan Ibnu Majah', short: 'Ibnu Majah', bookNo: 6, compiler: 'Imam Ibnu Majah (209 - 273 H)', totalHadist: '4.332' },
  { key: 'H7', slug: 'musnad-ahmad', label: 'Musnad Ahmad', short: 'Ahmad', bookNo: 7, compiler: 'Imam Ahmad (164 - 241 H)', totalHadist: '26.363' },
  { key: 'H8', slug: 'muwatha-malik', label: 'Muwatha\' Malik', short: 'Malik', bookNo: 8, compiler: 'Imam Malik (93 - 179 H)', totalHadist: '1.594' },
  { key: 'H9', slug: 'sunan-darimi', label: 'Sunan Darimi', short: 'Darimi', bookNo: 9, compiler: 'Imam Darimi (181 - 255 H)', totalHadist: '3.367' },
];

export default function AdminHadist9ImamPage() {
  const [search, setSearch] = useState('');
  const [bookStats, setBookStats] = useState<Record<string, { total: number; clean: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/folders-hadist-stats');
        if (res.ok) {
          const data = await res.json();
          if (data.bookStats) setBookStats(data.bookStats);
        }
      } catch (e) {
        console.error('Failed to load stats', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const filteredBooks = NINE_BOOKS.filter(b => 
    b.label.toLowerCase().includes(search.toLowerCase()) ||
    b.compiler.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16 font-sans">
      
      {/* Header Clean Gemini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Hadist 9 Imam (Kutubut Tis'ah)
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              <ShieldCheck size={12} />
              <span>Standar Kitab Induk</span>
            </span>
          </div>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Pusat direktori 9 kitab induk hadist mu'tabar yang menjadi rujukan periwayatan utama di lingkungan Islam.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Link
            href="/hadist"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-medium transition shadow-sm"
          >
            <span>Buka Portal Pembaca</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Search Input Clean */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama kitab hadist atau nama imam pengarang..."
          className="w-full bg-[#FAFAFA] rounded-2xl pl-9 pr-4 py-3 text-xs text-zinc-900 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition font-medium"
        />
      </div>

      {/* Grid 9 Kitab Hadist Clean Flat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredBooks.map((book) => {
          const stats = bookStats[book.key];

          return (
            <div
              key={book.key}
              className="p-5 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/70 transition flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-white border border-zinc-200/60 text-zinc-700 flex items-center justify-center text-xs font-bold font-mono">
                    {book.key}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Kitab Ke-{book.bookNo}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition">
                    {book.label}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    {book.compiler}
                  </p>
                </div>
              </div>

              {/* Stats & Link */}
              <div className="pt-3 border-t border-zinc-200/50 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">Estimasi Hadist</span>
                  <span className="font-bold text-zinc-800">
                    {stats?.total ? stats.total.toLocaleString('id-ID') : book.totalHadist}
                  </span>
                </div>

                <Link
                  href={`/hadist/${book.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-semibold text-xs transition"
                >
                  <span>Buka Kitab</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Tambahan Clean */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] flex items-start gap-3.5 border border-zinc-100">
        <Library size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-zinc-600 leading-relaxed">
          <p className="font-semibold text-zinc-800">
            Daftar Lengkap Kutubut Tis'ah
          </p>
          <p className="text-[11px] text-zinc-500">
            Semua kitab telah dilengkapi penomoran hadist standar, teks Arab, terjemahan bahasa Indonesia, dan pencarian bab/tema.
          </p>
        </div>
      </div>

    </div>
  );
}
