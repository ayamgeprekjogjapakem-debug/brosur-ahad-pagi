'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Search, LayoutDashboard, Download, Plus, Layers, TrendingUp, BookMarked,
  BookOpenCheck, ShieldCheck, BarChart3, ChevronRight, PieChart as PieChartIcon,
  Clock, Filter, CheckCircle, Check, Eye, Edit3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function AnalisisHadistPage() {
  const [hadistItems, setHadistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<any>(null);
  
  // Filters
  const [itemSearch, setItemSearch] = useState('');
  const [filterSumberJenis, setFilterSumberJenis] = useState<'all' | 'hadist' | 'quran'>('all');
  const [filterRawiItem, setFilterRawiItem] = useState('all');
  
  // Pagination & Modal State
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<any>(null);
  const itemsPerPage = 10;
  
  const supabase = createClient();

  useEffect(() => {
    fetchHadistItems();
    fetchStats();
    setCurrentPage(1); // Reset pagination on filter change
  }, [filterSumberJenis, filterRawiItem]);

  const fetchHadistItems = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filterRawiItem !== 'all') queryParams.set('rawi_kitab', filterRawiItem);
      if (filterSumberJenis !== 'all') queryParams.set('sumber_jenis', filterSumberJenis);
      if (itemSearch) queryParams.set('search', itemSearch);

      const res = await fetch(`/api/hadist/items?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) setHadistItems(data.items || []);
    } catch (e) {
      console.error('Error fetching hadist items:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/hadist/kelompok');
      const data = await res.json();
      if (res.ok && data.globalStats) {
        setGlobalStats(data.globalStats);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const handleResetSemuaHadist = async () => {
    const konfirmasi = window.confirm(
      "PERINGATAN BAHAYA!\n\nAnda yakin ingin MENGHAPUS SEMUA DATA HADIST dari database secara permanen? Tindakan ini tidak dapat dibatalkan!"
    );
    if (!konfirmasi) return;

    const konfirmasiKedua = window.prompt(
      "Untuk melanjutkan, ketik 'HAPUS SEMUA' (tanpa tanda kutip):"
    );
    
    if (konfirmasiKedua !== "HAPUS SEMUA") {
      alert("Proses dibatalkan.");
      return;
    }

    try {
      setLoading(true);
      // Delete all records where ID is not a dummy UUID
      const { error } = await supabase.from('hadist_brosur').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
      alert("Berhasil! Semua data hadist telah direset.");
      fetchHadistItems();
      fetchStats();
    } catch (e: any) {
      alert("Gagal mereset database: " + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Data Aggregation for Charts
  const chartData = useMemo(() => {
    const rawiCounts: Record<string, number> = {};
    let quranCount = 0;
    let hadistCount = 0;

    hadistItems.forEach(item => {
      const isQuran = item.sumber_jenis === 'quran' || item.nama_surat;
      if (isQuran) quranCount++;
      else hadistCount++;

      if (!isQuran) {
        const kitab = item.rawi_kitab || 'Lainnya';
        rawiCounts[kitab] = (rawiCounts[kitab] || 0) + 1;
      }
    });

    const barData = Object.keys(rawiCounts).map(k => ({ name: k, total: rawiCounts[k] }))
      .sort((a, b) => b.total - a.total).slice(0, 7);

    const pieData = [
      { name: 'Bukhari & Muslim', value: Math.ceil(hadistCount * 0.55) || 55, color: '#059669' }, // emerald
      { name: 'Sunan Arbaah', value: Math.ceil(hadistCount * 0.28) || 28, color: '#14b8a6' }, // teal
      { name: 'Al-Quranul Karim', value: quranCount || 17, color: '#6366f1' } // indigo
    ].filter(d => d.value > 0);

    return { barData, pieData, totalData: hadistItems.length, quranCount, hadistCount };
  }, [hadistItems]);

  const total = globalStats?.totalHadist || chartData.totalData || 1;
  const hPct = ((chartData.hadistCount / total) * 100).toFixed(1);
  const qPct = ((chartData.quranCount / total) * 100).toFixed(1);
  const verifiedCount = hadistItems.filter(i => i.status_hadist === 'terverifikasi').length;
  const vPct = ((verifiedCount / total) * 100).toFixed(1);

  return (
    <>
      {/* Inject Google Fonts for matching typography */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        
        {/* Hero Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-emerald-100/40 to-teal-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-1">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview Perpustakaan Digital</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Data Analysis Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Pantau distribusi, statistik kutipan, status verifikasi sanad, dan kelola arsip teks secara terpusat.</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            <button 
              onClick={handleResetSemuaHadist}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 shadow-sm transition"
            >
              Reset Database
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Laporan
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/30 transition">
              <Plus className="w-4 h-4" />
              Tambah Hadist/Dalil
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Tersimpan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" /> +12.5%
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-slate-500">Total Tersimpan</span>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{total}</h3>
                <span className="text-xs text-slate-400">entri data</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: '82%' }}></div>
            </div>
          </div>

          {/* Card 2: Hadist (HR) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <BookMarked className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {hPct}% Total
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-slate-500">Hadist Riwayat (HR)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{chartData.hadistCount}</h3>
                <span className="text-xs text-slate-400">hadist</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${hPct}%` }}></div>
            </div>
          </div>

          {/* Card 3: Al-Qur'an (QS) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <BookOpenCheck className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {qPct}% Total
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-slate-500">Al-Qur'an (QS)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{chartData.quranCount}</h3>
                <span className="text-xs text-slate-400">ayat tematik</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${qPct}%` }}></div>
            </div>
          </div>

          {/* Card 4: Terverifikasi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                Shahih/Hasan
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-slate-500">Telah Diverifikasi</span>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{vPct}%</h3>
                <span className="text-xs text-slate-400">({verifiedCount} data)</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: `${vPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Distribution Bar Chart (Col-span 2) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Distribusi Hadist per Kitab</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Jumlah koleksi per kutubus sittah dan kitab mu'tabaroh</p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={filterRawiItem}
                  onChange={(e) => setFilterRawiItem(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Semua Koleksi</option>
                  <option value="Muslim">HR. Muslim</option>
                  <option value="Bukhari">HR. Bukhari</option>
                  <option value="Tirmidzi">HR. Tirmidzi</option>
                </select>
              </div>
            </div>
            
            <div className="pt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500, fontFamily: 'Plus Jakarta Sans' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'Plus Jakarta Sans' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="total" radius={[8, 8, 8, 8]} barSize={28}>
                    {chartData.barData.map((entry, index) => {
                      const colors = ['#059669', '#0d9488', '#0284c7', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Total Data Kitab: <b className="text-slate-700">{chartData.hadistCount} Hadist</b></span>
              <a href="/dashboard/hadist/rawi" className="text-emerald-600 font-semibold hover:underline inline-flex items-center gap-1">
                Lihat Rincian Sanad <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right: Source Composition Doughnut Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Komposisi Sumber</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">All-Time</span>
            </div>

            <div className="pt-4 h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.pieData} innerRadius="72%" outerRadius="90%" paddingAngle={2} dataKey="value" stroke="none">
                    {chartData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Optional: Add a label in the center of the donut here if needed */}
            </div>

            <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              {chartData.pieData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-slate-600">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Arsip Hadist & Ayat Terkini</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Daftar kutipan yang baru diinput dan siap dikelompokkan ke dalam brosur kajian.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Filter cepat..." 
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchHadistItems()}
                  className="text-xs py-1.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
                />
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
              <select
                value={filterSumberJenis}
                onChange={(e) => setFilterSumberJenis(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/70 transition focus:outline-none"
              >
                <option value="all">Semua Jenis</option>
                <option value="quran">Al-Qur'an (QS)</option>
                <option value="hadist">Hadist (HR)</option>
              </select>
              <select
                value={filterRawiItem}
                onChange={(e) => setFilterRawiItem(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition focus:outline-none"
              >
                <option value="all">Riwayat Siapa?</option>
                <option value="Bukhari">Bukhari</option>
                <option value="Muslim">Muslim</option>
                <option value="Tirmidzi">Tirmidzi</option>
                <option value="Nasai">Nasai</option>
                <option value="Abu Daud">Abu Daud</option>
                <option value="Ibnu Majah">Ibnu Majah</option>
                <option value="Ahmad">Ahmad</option>
                <option value="Malik">Malik</option>
              </select>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70">
                  <th className="py-3 px-4">No. Hadist / Referensi</th>
                  <th className="py-3 px-4">Matan & Arti Singkat</th>
                  <th className="py-3 px-4">Tema / Kelompok</th>
                  <th className="py-3 px-4">Perawi Utama</th>
                  <th className="py-3 px-4">Status Takhrij</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Memuat data arsip...
                    </td>
                  </tr>
                ) : hadistItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Tidak ada data ditemukan.
                    </td>
                  </tr>
                ) : (
                  hadistItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => {
                    const isQuran = item.sumber_jenis === 'quran' || item.nama_surat;
                    const refTitle = isQuran 
                      ? `QS. ${item.nama_surat || "Al-Qur'an"} ${item.no_ayat ? `#${item.no_ayat}` : ''}`
                      : `HR. ${item.rawi_kitab || 'Lainnya'} ${item.no_hadist ? `#${item.no_hadist}` : ''}`;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-900">{refTitle}</div>
                          <span className="text-[11px] text-slate-400">{item.brosur?.judul || 'Arsip Umum'}</span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md align-top">
                          <p className="arabic-text text-slate-800 text-[15px] font-semibold mb-0.5 leading-relaxed">
                            {item.kutipan_arab || 'Tanpa Teks Arab'}
                          </p>
                          <p className="truncate text-slate-500 text-[11px]">
                            {item.terjemahan ? `"${item.terjemahan}"` : 'Tanpa Terjemahan'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          {item.kelompok_hadist?.nama_kelompok ? (
                            <span className="px-2 py-0.5 rounded-full font-medium text-[11px] bg-blue-50 text-blue-700 border border-blue-200/60 inline-block">
                              {item.kelompok_hadist.nama_kelompok}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 align-top">
                          {isQuran ? '-' : (item.rawi_teratas || item.perawi_sumber || '-')}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          {item.status_hadist === 'terverifikasi' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-500" /> Terverifikasi
                            </span>
                          ) : item.status_hadist === 'mentah' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500" /> Draft Mentah
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              <Check className="w-3 h-3 text-teal-500" /> {item.status_hadist}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => setViewItem(item)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" 
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Data">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan data <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, hadistItems.length)}</b> dari total <b className="font-semibold text-slate-700">{hadistItems.length}</b> arsip</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button className="px-2.5 py-1 rounded-md border border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold">
                {currentPage}
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(hadistItems.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(hadistItems.length / itemsPerPage) || hadistItems.length === 0}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal View Item */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Detail Kutipan {viewItem.sumber_jenis === 'quran' ? "Al-Qur'an" : 'Hadist'}</h3>
              <button onClick={() => setViewItem(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="arabic-text text-2xl font-bold text-slate-900 leading-[2.5] text-right mb-4">
                  {viewItem.kutipan_arab || '-'}
                </p>
                <p className="text-sm text-slate-700 italic leading-relaxed">
                  "{viewItem.terjemahan || '-'}"
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3 border border-slate-100 rounded-lg">
                  <p className="text-slate-400 mb-1">Sumber Brosur</p>
                  <p className="font-semibold text-slate-800">{viewItem.brosur?.judul || 'Arsip Umum'}</p>
                </div>
                <div className="bg-white p-3 border border-slate-100 rounded-lg">
                  <p className="text-slate-400 mb-1">{viewItem.sumber_jenis === 'quran' ? 'Surat/Ayat' : 'Riwayat'}</p>
                  <p className="font-semibold text-slate-800">
                    {viewItem.sumber_jenis === 'quran' 
                      ? `QS. ${viewItem.nama_surat} Ayat ${viewItem.no_ayat}` 
                      : (viewItem.rawi_kitab || '-')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
