'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Book, Loader2, ArrowLeft, Hash, Edit3, Bookmark,
  Calendar, CheckCircle, List
} from 'lucide-react';

export default function HadistDetailPage() {
  const { slug, id } = useParams();
  const [hadist, setHadist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHadist = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/hadist/items?sumber_jenis=hadist`);
        const data = await res.json();
        
        if (data.items) {
          const found = data.items.find((item: any) => item.id === id);
          if (found) setHadist(found);
        }
      } catch (e) {
        console.error('Error fetching hadist detail:', e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchHadist();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-500 font-semibold text-sm animate-pulse">Memuat detail hadist...</p>
      </div>
    );
  }

  if (!hadist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Book className="w-12 h-12 text-slate-200 mb-4" />
        <h2 className="text-lg font-bold text-slate-700">Hadist Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500 mt-2">Data dengan ID tersebut tidak ada di database.</p>
        <Link href={`/dashboard/hadist/kitab/${slug}`} className="mt-6 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition">
          Kembali ke Daftar
        </Link>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">

        <Link href={`/dashboard/hadist/kitab/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>

        {/* Header Information */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-emerald-100/40 to-teal-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10 flex-1 flex gap-5">
            <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center shrink-0">
              <Hash className="w-4 h-4 text-emerald-600 mb-0.5" />
              <span className="font-extrabold text-lg text-emerald-700">{hadist.no_hadist || '?'}</span>
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-bold rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  {hadist.status_hadist === 'terverifikasi' ? 'Terverifikasi' : hadist.status_hadist || 'Terverifikasi'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 text-[11px] font-bold rounded-full uppercase tracking-wider">
                  <Bookmark className="w-3 h-3" />
                  {hadist.kelompok_hadist?.nama_kelompok || 'Tanpa Tema'}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                HR. {hadist.rawi_kitab || 'Tanpa Keterangan Kitab'}
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Diinput pada: {new Date(hadist.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all">
              <Edit3 className="w-4 h-4" /> Edit Data
            </button>
          </div>
        </div>

        {/* Tabular Detail Content */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Informasi Detail Hadist</h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <tbody className="divide-y divide-slate-100 text-slate-600">
                
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <th className="py-4 px-6 w-48 sm:w-64 font-semibold text-slate-500 bg-slate-50/30 align-top">
                    Nomor Indeks Hadist
                  </th>
                  <td className="py-4 px-6 font-bold text-slate-800 align-top">
                    {hadist.no_hadist || 'Tidak ada nomor'}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <th className="py-4 px-6 w-48 sm:w-64 font-semibold text-slate-500 bg-slate-50/30 align-top">
                    Mukharij (Kitab Induk)
                  </th>
                  <td className="py-4 px-6 font-bold text-slate-800 align-top">
                    {hadist.rawi_kitab || '-'}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <th className="py-4 px-6 w-48 sm:w-64 font-semibold text-slate-500 bg-slate-50/30 align-top">
                    Perawi Sumber (Sahabat)
                  </th>
                  <td className="py-4 px-6 font-semibold text-slate-800 align-top">
                    {hadist.perawi_sumber || 'Tidak disebutkan'}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <th className="py-4 px-6 w-48 sm:w-64 font-semibold text-slate-500 bg-slate-50/30 align-top">
                    Tema Kelompok / Brosur
                  </th>
                  <td className="py-4 px-6 align-top">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 text-xs">
                        Tema: {hadist.kelompok_hadist?.nama_kelompok || 'Tanpa Tema'}
                      </span>
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 text-xs">
                        Brosur: {hadist.brosur?.judul || 'Arsip Umum'}
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <th className="py-4 px-6 w-48 sm:w-64 font-semibold text-slate-500 bg-slate-50/30 align-top">
                    Halaman Brosur
                  </th>
                  <td className="py-4 px-6 font-semibold text-slate-800 align-top">
                    {hadist.halaman_brosur ? `Halaman ${hadist.halaman_brosur}` : 'Tidak ditentukan'}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <th className="py-6 px-6 w-48 sm:w-64 font-semibold text-slate-500 bg-slate-50/30 align-top">
                    Kutipan Teks Arab
                  </th>
                  <td className="py-6 px-6 align-top">
                    <p className="arabic-text text-2xl font-bold text-slate-900 leading-[2.5] text-right">
                      {hadist.kutipan_arab || '-'}
                    </p>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 transition-colors">
                  <th className="py-6 px-6 w-48 sm:w-64 font-semibold text-slate-500 bg-slate-50/30 align-top">
                    Terjemahan Indonesia
                  </th>
                  <td className="py-6 px-6 align-top">
                    <p className="text-sm text-slate-700 italic leading-relaxed">
                      "{hadist.terjemahan || '-'}"
                    </p>
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
