'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, Users, UserCheck, Star } from 'lucide-react';

// DUMMY DATA: Daftar Sahabat Nabi (Perawi Sumber)
const DUMMY_SAHABAT = [
  { id: 'abu-hurairah', nama: 'Abu Hurairah', title: 'Abdurrahman bin Shakhr Ad-Dausi', riwayat: 5374, desc: 'Sahabat yang paling banyak meriwayatkan hadist. Masuk Islam pada tahun 7 H (Perang Khaibar).' },
  { id: 'ibnu-umar', nama: 'Abdullah bin Umar', title: 'Ibnu Umar bin Al-Khattab', riwayat: 2630, desc: 'Sangat ketat dan disiplin dalam meniru setiap perbuatan dan jejak langkah Rasulullah ﷺ.' },
  { id: 'anas-bin-malik', nama: 'Anas bin Malik', title: 'Pelayan Rasulullah ﷺ', riwayat: 2286, desc: 'Melayani Rasulullah ﷺ selama 10 tahun di Madinah sejak usia 10 tahun.' },
  { id: 'aisyah', nama: 'Aisyah binti Abu Bakar', title: 'Ummul Mukminin', riwayat: 2210, desc: 'Istri Rasulullah ﷺ yang paling banyak meriwiyatkan hukum fikih dan urusan keluarga tangga.' },
  { id: 'ibnu-abbas', nama: 'Abdullah bin Abbas', title: 'Turjumanul Qur\'an', riwayat: 1660, desc: 'Sepupu Nabi ﷺ yang didoakan khusus agar paham agama dan tafsir Al-Qur\'an.' },
  { id: 'jabir', nama: 'Jabir bin Abdullah', title: 'Jabir bin Abdullah Al-Anshari', riwayat: 1540, desc: 'Ikut serta dalam 19 peperangan bersama Rasulullah ﷺ dan banyak meriwayatkan hadist haji.' },
  { id: 'abu-said', nama: 'Abu Sa\'id Al-Khudri', title: 'Sa\'ad bin Malik bin Sinan', riwayat: 1170, desc: 'Salah satu mufti Madinah dari kalangan sahabat junior yang banyak ilmunya.' },
];

export default function SahabatPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSahabat = DUMMY_SAHABAT.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-blue-100/40 to-indigo-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold mb-1">
              <Users className="w-4 h-4" />
Perawi Tingkat Pertama
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Koleksi Sahabat Nabi</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Daftar para sahabat Nabi ﷺ (Perawi Sumber) tempat bermulanya riwayat hadist sebelum dikompilasi oleh Imam Mukharij. (Saat ini menggunakan data Dummy)
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Urutan Berdasarkan Riwayat</h2>
              <p className="text-xs text-slate-500 mt-1">Menampilkan tokoh sahabat pengumpul riwayat terbanyak.</p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama sahabat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70 uppercase tracking-wider">
                  <th className="py-4 px-6 w-24 text-center">Urutan</th>
                  <th className="py-4 px-6 w-64">Nama Sahabat</th>
                  <th className="py-4 px-6">Informasi & Biografi Singkat</th>
                  <th className="py-4 px-6 w-32 text-center">Riwayat Hadist</th>
                  <th className="py-4 px-6 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredSahabat.map((sahabat, index) => {
                  return (
                    <tr key={sahabat.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-4 px-6 align-middle text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 font-bold text-sm text-blue-700 shadow-sm">
                          #{index + 1}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{sahabat.nama}</div>
                            <span className="text-xs text-slate-500">{sahabat.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <p className="text-slate-600 font-medium">
                          {sahabat.desc}
                        </p>
                      </td>
                      <td className="py-4 px-6 align-middle text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-extrabold text-slate-800">{sahabat.riwayat.toLocaleString('id-ID')}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Riwayat</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right align-middle">
                        <Link 
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert('Halaman detail sahabat sedang dalam pengembangan.'); }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm"
                        >
                          Lihat <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filteredSahabat.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <Star className="w-10 h-10 text-slate-200 mb-2" />
                        <span className="font-semibold text-base text-slate-500">Nama sahabat tidak ditemukan</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
