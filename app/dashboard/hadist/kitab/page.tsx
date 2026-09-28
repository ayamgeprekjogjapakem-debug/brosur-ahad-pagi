'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, ChevronRight, BookOpen, Search, ShieldCheck, ListOrdered, Loader2, Eye } from 'lucide-react';

// Peringkat Kitab berdasarkan urutan standar keshahihan Ahlussunnah
const KITAB_RANKING = [
  { id: 'bukhari', nama: 'Bukhari', title: 'Shahih Bukhari', desc: 'Kitab paling shahih setelah Al-Quran.' },
  { id: 'muslim', nama: 'Muslim', title: 'Shahih Muslim', desc: 'Kitab shahih kedua terpercaya.' },
  { id: 'abu-daud', nama: 'Abu Daud', title: 'Sunan Abu Daud', desc: 'Fokus pada hadist ahkam.' },
  { id: 'tirmidzi', nama: 'Tirmidzi', title: 'Sunan At-Tirmidzi', desc: 'Memiliki penilaian derajat hadist (Hasan, Shahih).' },
  { id: 'nasai', nama: 'Nasai', title: 'Sunan An-Nasai', desc: 'Syarat periwayatan sangat ketat.' },
  { id: 'ibnu-majah', nama: 'Ibnu Majah', title: 'Sunan Ibnu Majah', desc: 'Melengkapi Kutubus Sittah.' },
  { id: 'ahmad', nama: 'Ahmad', title: 'Musnad Ahmad', desc: 'Kumpulan hadist terbanyak.' },
  { id: 'malik', nama: 'Malik', title: 'Al-Muwaththa Malik', desc: 'Kitab hadist tertua yang disusun sistematis.' },
  { id: 'darimi', nama: 'Darimi', title: 'Sunan Ad-Darimi', desc: 'Sering disebut melengkapi Kutubut Tis\'ah.' }
];

export default function ListKitabPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/hadist/items?sumber_jenis=hadist');
        const data = await res.json();
        
        if (data.items) {
          const counts: Record<string, number> = {};
          data.items.forEach((item: any) => {
            const kitab = (item.rawi_kitab || '').toLowerCase();
            if (!kitab) return;
            
            // Match to known slugs
            const matched = KITAB_RANKING.find(k => kitab.includes(k.nama.toLowerCase()));
            const slug = matched ? matched.id : 'lainnya';
            
            counts[slug] = (counts[slug] || 0) + 1;
          });
          setStats(counts);
        }
      } catch (e) {
        console.error('Error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-emerald-100/40 to-teal-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Daftar Perawi Utama</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Koleksi Kitab Hadist</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Pilih nama Imam / Kitab di bawah ini untuk melihat daftar hadist lengkap yang diurutkan secara otomatis. Diurutkan berdasarkan derajat keshahihannya.
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Urutan Prioritas Kitab</h2>
              <p className="text-xs text-slate-500 mt-1">Daftar ini diurutkan dari tingkat keshahihan tertinggi.</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              <ListOrdered className="w-5 h-5" />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70 uppercase tracking-wider">
                  <th className="py-4 px-6 w-24 text-center">Peringkat</th>
                  <th className="py-4 px-6 w-64">Nama Kitab & Imam</th>
                  <th className="py-4 px-6">Informasi / Deskripsi</th>
                  <th className="py-4 px-6 w-32 text-center">Total Tersimpan</th>
                  <th className="py-4 px-6 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {KITAB_RANKING.map((kitab, index) => {
                  const count = stats[kitab.id] || 0;
                  
                  return (
                    <tr key={kitab.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-4 px-6 align-middle text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 font-bold text-sm text-emerald-700 shadow-sm">
                          #{index + 1}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">HR. {kitab.nama}</div>
                            <span className="text-xs text-slate-500">{kitab.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <p className="text-slate-600 font-medium">
                          {kitab.desc}
                        </p>
                      </td>
                      <td className="py-4 px-6 align-middle text-center">
                        <div className="flex flex-col items-center">
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ) : (
                            <>
                              <span className="text-lg font-extrabold text-slate-800">{count}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hadist</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right align-middle">
                        <Link 
                          href={`/dashboard/hadist/kitab/${kitab.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm"
                        >
                          Lihat <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {/* Baris Khusus Kitab Lainnya */}
                <tr className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors group border-t-2 border-dashed border-slate-200">
                  <td className="py-4 px-6 align-middle text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 font-bold text-sm text-slate-500">
                      -
                    </div>
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Kitab Lainnya</div>
                        <span className="text-xs text-slate-500">Selain Kutubut Tis'ah</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <p className="text-slate-500 italic">
                      Daftar riwayat hadist yang tidak termasuk ke dalam 9 kategori kitab utama.
                    </p>
                  </td>
                  <td className="py-4 px-6 align-middle text-center">
                    <div className="flex flex-col items-center">
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <>
                          <span className="text-lg font-bold text-slate-700">{stats['lainnya'] || 0}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hadist</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right align-middle">
                    <Link 
                      href={`/dashboard/hadist/kitab/lainnya`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-200 transition-all shadow-sm"
                    >
                      Lihat <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
