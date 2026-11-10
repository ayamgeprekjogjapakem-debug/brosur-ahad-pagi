'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, History, Clock, Flame, ChevronLeft, ChevronRight,
  Search, Sparkles, MessageSquare, Trash2, ExternalLink
} from 'lucide-react';
import MainSidebar from '@/app/components/MainSidebar';

export default function AiRiwayatPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'my_history' | 'recent_chat' | 'popular_chat'>('my_history');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentDbChats, setRecentDbChats] = useState<{ id: string; slug?: string; title: string; query: string; category?: string; sessionMessages?: any[] }[]>([]);
  const [popularDbChats, setPopularDbChats] = useState<{ id: string; slug?: string; title: string; query: string; count?: number; category?: string; sessionMessages?: any[] }[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    // 1. Muat Riwayat Pencarian dari LocalStorage
    try {
      const hist = JSON.parse(localStorage.getItem('makkah_search_history') || '[]');
      if (Array.isArray(hist)) setSearchHistory(hist);
    } catch (_) { }

    // 2. Muat Chat Terbaru & Chat Terpopuler dari Database API
    const fetchFeeds = async () => {
      try {
        const res = await fetch('/api/ai/chat');
        const data = await res.json();
        if (data && data.success) {
          if (Array.isArray(data.recentChats)) setRecentDbChats(data.recentChats);
          if (Array.isArray(data.popularChats)) setPopularDbChats(data.popularChats);
        }
      } catch (err) {
        console.warn('Gagal memuat feed database AI:', err);
      }
    };
    fetchFeeds();
  }, []);

  // Reset page saat tab atau filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterQuery]);

  const handleClearHistory = () => {
    if (window.confirm('Hapus seluruh riwayat pencarian saya di perangkat ini?')) {
      localStorage.removeItem('makkah_search_history');
      setSearchHistory([]);
    }
  };

  const handleRemoveHistoryItem = (index: number) => {
    const nextHist = [...searchHistory];
    nextHist.splice(index, 1);
    localStorage.setItem('makkah_search_history', JSON.stringify(nextHist));
    setSearchHistory(nextHist);
  };

  // Filter Data Berdasarkan Pencarian Kata Kunci
  const filteredMyHistory = searchHistory.filter(q => q.toLowerCase().includes(filterQuery.toLowerCase()));
  const filteredRecent = recentDbChats.filter(item => 
    (item.title && item.title.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (item.query && item.query.toLowerCase().includes(filterQuery.toLowerCase()))
  );
  const filteredPopular = popularDbChats.filter(item => 
    (item.title && item.title.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (item.query && item.query.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  // Ambil data untuk tab aktif
  const currentTotal = activeTab === 'my_history' 
    ? filteredMyHistory.length 
    : activeTab === 'recent_chat' 
    ? filteredRecent.length 
    : filteredPopular.length;

  const totalPages = Math.ceil(currentTotal / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Main Sidebar Standar */}
      <MainSidebar
        aiMode={true}
        recentAiChats={recentDbChats}
        popularAiChats={popularDbChats}
        onNewAiSession={() => router.push('/ai-pustaka')}
        onSelectCommunityChat={(item) => {
          if (item.slug) {
            router.push(`/ai-pustaka?slug=${encodeURIComponent(item.slug)}`);
          } else {
            router.push(`/ai-pustaka?q=${encodeURIComponent(item.query || item.title)}`);
          }
        }}
      />

      {/* Konten Halaman Riwayat */}
      <main className="flex-1 flex flex-col relative h-full bg-white overflow-hidden min-w-0">
        
        {/* Header Bersih */}
        <header className="h-16 sticky top-0 left-0 right-0 px-4 sm:px-6 flex items-center justify-between z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/ai-pustaka"
              className="p-2 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-normal rounded-xl hover:bg-slate-100 transition"
              title="Kembali ke Ruang Tanya AI"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Chat AI</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="text-base sm:text-lg font-normal text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              <span>Riwayat & Kueri Komunitas</span>
            </h1>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-4xl mx-auto w-full">
          
          {/* Subheader Deskripsi & Filter Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-normal text-slate-900">Arsip Pertanyaan & Telaah</h2>
              <p className="text-xs sm:text-sm font-normal text-slate-500 mt-0.5">
                Pilih topik telaah untuk langsung membuka kembali rujukan dan analisis fiqih.
              </p>
            </div>

            {/* Input Filter Ringan */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Cari topik..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 3 Tab Navigasi: Riwayat Saya, Chat Baru, Terpopuler */}
          <div className="flex items-center border-b border-slate-200 gap-2 sm:gap-4 text-sm font-normal">
            <button
              type="button"
              onClick={() => setActiveTab('my_history')}
              className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition cursor-pointer ${
                activeTab === 'my_history'
                  ? 'border-emerald-600 text-emerald-800 font-normal'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Saya</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                {filteredMyHistory.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('recent_chat')}
              className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition cursor-pointer ${
                activeTab === 'recent_chat'
                  ? 'border-emerald-600 text-emerald-800 font-normal'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Chat Baru</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                {filteredRecent.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('popular_chat')}
              className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition cursor-pointer ${
                activeTab === 'popular_chat'
                  ? 'border-emerald-600 text-emerald-800 font-normal'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Terpopuler</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                {filteredPopular.length}
              </span>
            </button>
          </div>

          {/* List Content */}
          <div className="space-y-2.5 min-h-[350px]">

            {/* TAB 1: RIWAYAT SAYA */}
            {activeTab === 'my_history' && (
              <>
                <div className="flex items-center justify-between pb-1 text-xs text-slate-500 font-normal">
                  <span>Pencarian yang pernah Anda lakukan di perangkat ini</span>
                  {searchHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-slate-400 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer font-normal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  )}
                </div>

                {filteredMyHistory.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl p-6">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-normal text-slate-600">Belum ada riwayat pencarian.</p>
                    <p className="text-xs font-normal text-slate-400 mt-1">Pertanyaan yang Anda ajukan di chat AI akan tersimpan di sini.</p>
                  </div>
                ) : (
                  filteredMyHistory.slice(startIndex, endIndex).map((query, i) => (
                    <div
                      key={startIndex + i}
                      className="group flex items-center justify-between p-3.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 rounded-2xl transition shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/ai-pustaka?q=${encodeURIComponent(query)}`)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-emerald-100/70 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center shrink-0 transition">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-normal text-slate-800 group-hover:text-emerald-900 truncate">
                            {query}
                          </p>
                          <span className="text-[11px] font-normal text-slate-400">Klik untuk langsung membuka telaah AI</span>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveHistoryItem(startIndex + i)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus riwayat ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* TAB 2: CHAT BARU (KOMUNITAS) */}
            {activeTab === 'recent_chat' && (
              <>
                <div className="pb-1 text-xs text-slate-500 font-normal">
                  Daftar kueri dan pembahasan yang baru saja ditanyakan oleh asatidzah & penelaah
                </div>

                {filteredRecent.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl p-6">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-normal text-slate-600">Belum ada sesi percakapan terbaru.</p>
                  </div>
                ) : (
                  filteredRecent.slice(startIndex, endIndex).map((item, i) => (
                    <div
                      key={item.id || startIndex + i}
                      className="group flex items-center justify-between p-3.5 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50/20 rounded-2xl transition shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (item.slug) {
                            router.push(`/ai-pustaka?slug=${encodeURIComponent(item.slug)}`);
                          } else {
                            router.push(`/ai-pustaka?q=${encodeURIComponent(item.query || item.title)}`);
                          }
                        }}
                        className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-normal text-slate-800 group-hover:text-teal-900 truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-normal text-slate-400">
                            <span>{item.category || 'Materi & Dalil'}</span>
                            {item.slug && (
                              <span className="text-teal-600 flex items-center gap-0.5">
                                • Tautan Tersedia
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.slug) {
                              router.push(`/ai-pustaka?slug=${encodeURIComponent(item.slug)}`);
                            } else {
                              router.push(`/ai-pustaka?q=${encodeURIComponent(item.query || item.title)}`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-100/70 text-slate-600 hover:text-teal-900 text-xs font-normal transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Buka</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* TAB 3: TERPOPULER */}
            {activeTab === 'popular_chat' && (
              <>
                <div className="pb-1 text-xs text-slate-500 font-normal">
                  Tema dan permasalahan fiqih yang paling sering ditelaah & dibaca
                </div>

                {filteredPopular.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl p-6">
                    <Flame className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-normal text-slate-600">Belum ada data topik populer.</p>
                  </div>
                ) : (
                  filteredPopular.slice(startIndex, endIndex).map((item, i) => (
                    <div
                      key={item.id || startIndex + i}
                      className="group flex items-center justify-between p-3.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 rounded-2xl transition shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (item.slug) {
                            router.push(`/ai-pustaka?slug=${encodeURIComponent(item.slug)}`);
                          } else {
                            router.push(`/ai-pustaka?q=${encodeURIComponent(item.query || item.title)}`);
                          }
                        }}
                        className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-normal text-slate-800 group-hover:text-amber-900 truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-normal text-slate-400">
                            {item.count ? (
                              <span className="text-amber-700 font-normal">Ditanyakan {item.count}×</span>
                            ) : (
                              <span>Rekomendasi Utama</span>
                            )}
                            <span>• {item.category || 'Fiqih & Dalil'}</span>
                          </div>
                        </div>
                      </button>

                      <div className="shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.slug) {
                              router.push(`/ai-pustaka?slug=${encodeURIComponent(item.slug)}`);
                            } else {
                              router.push(`/ai-pustaka?q=${encodeURIComponent(item.query || item.title)}`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-amber-100/70 text-slate-600 hover:text-amber-900 text-xs font-normal transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Buka</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

          </div>

          {/* Paginasi Modern & Bersih */}
          {currentTotal > ITEMS_PER_PAGE && (
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-normal text-slate-500">
              <div>
                Menampilkan {startIndex + 1}–{Math.min(endIndex, currentTotal)} dari {currentTotal} hasil
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1 font-normal text-slate-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <span className="px-2 font-normal text-slate-700">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1 font-normal text-slate-700"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

