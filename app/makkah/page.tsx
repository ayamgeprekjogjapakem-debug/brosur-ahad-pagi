'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, BookOpen, Bookmark,
  Menu, MessageSquare, Settings, Sparkles, X,
  ArrowLeft, FileText, ChevronRight, Info,
  CheckCircle2, AlertTriangle, BookMarked, Copy, Check,
  TrendingUp
} from 'lucide-react';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';

export default function MakkahPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isShowingSaved, setIsShowingSaved] = useState(false);

  const handleCopy = (item: any) => {
    const sumber = item.sumber_jenis === 'quran'
      ? `QS. ${item.nama_surat || ''} : ${item.ayat || ''}`
      : `HR. ${item.rawi_kitab || ''} ${item.no_hadist ? 'no. ' + item.no_hadist : ''}`;

    const sumberBrosur = item.brosur?.judul ? `\nPustaka - Dari: ${item.brosur.judul}` : '';

    const textToCopy = `${item.kutipan_arab ? item.kutipan_arab + '\n\n' : ''}${item.terjemahan ? '"' + item.terjemahan + '"\n\n' : ''}[ ${sumber.trim()} ]${sumberBrosur}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load history dari LocalStorage saat pertama kali render
  useEffect(() => {
    const savedHistory = localStorage.getItem('makkah_search_history');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
    const savedDalil = localStorage.getItem('makkah_saved_dalil');
    if (savedDalil) {
      setSavedItems(JSON.parse(savedDalil));
    }
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsShowingSaved(false);

    // Simpan ke riwayat (maksimal 10)
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('makkah_search_history', JSON.stringify(newHistory));

    setSearchQuery(query);
    setIsSearching(true);

    try {
      // Integrasi ke API Hadist yang ada di dashboard
      const res = await fetch(`/api/hadist/items?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.items || []);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Error fetching search results:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('makkah_search_history');
  };

  const handleRemoveHistoryItem = (indexToRemove: number) => {
    const newHistory = searchHistory.filter((_, idx) => idx !== indexToRemove);
    setSearchHistory(newHistory);
    localStorage.setItem('makkah_search_history', JSON.stringify(newHistory));
  };

  const resetSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setIsShowingSaved(false);
  };

  const toggleSaveItem = (item: any) => {
    setSavedItems(prev => {
      const isSaved = prev.some(saved => saved.id === item.id);
      let newSaved;
      if (isSaved) {
        newSaved = prev.filter(saved => saved.id !== item.id);
      } else {
        newSaved = [item, ...prev];
      }
      localStorage.setItem('makkah_saved_dalil', JSON.stringify(newSaved));
      return newSaved;
    });
  };

  const [popularTopics, setPopularTopics] = useState<{ name: string, count: number }[]>([]);

  useEffect(() => {
    fetch('/api/search/popular')
      .then(res => res.json())
      .then(data => {
        if (data.topics && data.topics.length > 0) {
          setPopularTopics(data.topics);
        }
      })
      .catch(err => console.error('Gagal memuat topik populer:', err));
  }, []);

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">

      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-0'
          } flex-shrink-0 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out overflow-hidden flex flex-col z-20`}
      >
        <button
          onClick={resetSearch}
          className="w-full p-5 border-b border-slate-100 flex items-center gap-3 hover:bg-slate-50 transition text-left cursor-pointer"
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-emerald-600 to-teal-800 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="text-white w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 truncate">Pustaka MTA</h1>
            <p className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase truncate">v1.0 Makkah</p>
          </div>
        </button>

        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Utama</p>
            <div className="space-y-1">
              <button
                onClick={resetSearch}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${!isShowingSaved && searchResults === null ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
              >
                <Search className="w-4 h-4" /> Pencarian Baru
              </button>
              <button
                onClick={() => {
                  setSearchResults(savedItems);
                  setIsShowingSaved(true);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${isShowingSaved ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4" /> Dalil Tersimpan
                </div>
                {savedItems.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{savedItems.length}</span>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Riwayat Pencarian</p>
              {searchHistory.length > 0 && (
                <button onClick={handleClearHistory} className="text-[9px] font-bold text-slate-400 hover:text-rose-500 uppercase">Hapus</button>
              )}
            </div>

            <div className="space-y-1">
              {searchHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-3">Belum ada riwayat.</p>
              ) : (
                searchHistory.map((history, i) => (
                  <div key={i} className="group relative w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg transition">
                    <button
                      onClick={() => handleSearch(history)}
                      className="flex-1 flex items-center gap-3 text-left text-slate-500 hover:text-slate-800 text-sm truncate"
                    >
                      <MessageSquare className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 shrink-0" />
                      <span className="truncate">{history}</span>
                    </button>
                    <button
                      onClick={() => handleRemoveHistoryItem(i)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition shrink-0 ml-2"
                      title="Hapus riwayat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col relative h-full bg-white/50 overflow-y-auto">
        {/* Header Toggle */}
        <header className="sticky top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 shadow-sm transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            {searchResults !== null && (
              <button
                onClick={resetSearch}
                className="p-2 text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium transition"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            )}
          </div>

          <HeaderUserDropdown />
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center p-6">

          {/* Default Welcome Screen */}
          {searchResults === null ? (
            <div className="w-full max-w-2xl text-center space-y-8 mt-20">
              {/* Welcome Greeting */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold mb-2">
                  Ahlan wa Sahlan
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                  Selamat Datang, Ustadz.
                </h2>
                <p className="text-slate-500 text-lg">
                  Silakan cari dalil, ayat, atau referensi brosur untuk kajian hari ini.
                </p>
              </div>

              {/* Huge Search Bar */}
              <div className="relative group max-w-xl mx-auto">
                <div className="absolute -inset-1 bg-emerald-500/10 blur-xl rounded-3xl transition duration-500 opacity-0 group-focus-within:opacity-100" />
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }}
                  className="relative flex items-center bg-white border-2 border-slate-200 rounded-2xl p-2 shadow-sm focus-within:border-emerald-500 focus-within:shadow-md transition-all"
                >
                  <div className="pl-4 pr-2 text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-transparent border-none text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none py-3"
                    placeholder="Ketik kata kunci atau tema kajian..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="p-2 text-slate-400 hover:text-slate-600 transition">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="ml-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50"
                  >
                    {isSearching ? 'Mencari...' : 'Cari'}
                  </button>
                </form>
              </div>

              {/* Quick Suggestions */}
              {popularTopics.length > 0 && (
                <div className="pt-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Saran Topik Populer</p>
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    {popularTopics.map((topic, i) => (
                      <div key={i} className="relative">
                        <button
                          onClick={() => handleSearch(topic.name)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 rounded-full text-sm font-medium transition shadow-sm"
                        >
                          {topic.name}
                        </button>
                        <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border-2 border-white flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          {topic.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (

            /* Search Results Screen */
            <div className="w-full max-w-4xl space-y-6">

              {/* Sticky Top Search Bar inside results */}
              <div className="sticky top-[68px] bg-[#fafaf9] pt-2 pb-6 z-10">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }}
                  className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all max-w-2xl mx-auto"
                >
                  <div className="pl-3 pr-2 text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-transparent border-none text-base text-slate-800 placeholder:text-slate-400 focus:outline-none py-2"
                    placeholder="Cari lagi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="ml-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition shadow-sm text-sm disabled:opacity-50"
                  >
                    Cari
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <h3 className="text-xl font-bold text-slate-800">
                    {isShowingSaved ? "Dalil Tersimpan" : `Hasil untuk "${searchQuery}"`}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {isShowingSaved ? `Ada ${searchResults.length} dalil dalam koleksi Anda` : `Ditemukan ${searchResults.length} dalil yang relevan`}
                  </p>
                </div>
              </div>

              {/* Results List */}
              {isSearching ? (
                <div className="text-center py-20 text-emerald-600 animate-pulse font-medium">
                  Sedang menelusuri perpustakaan...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-400 rounded-full mb-4">
                    <Search className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-700">Tidak Ditemukan</h4>
                  <p className="text-slate-500 mt-1">Coba gunakan kata kunci lain atau sinonim.</p>
                </div>
              ) : (
                <div className="space-y-4 pb-20">
                  {searchResults.map((item, idx) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.sumber_jenis === 'quran' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                            {item.sumber_jenis === 'quran' ? "Al-Qur'an" : "Hadist"}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {item.rawi_kitab || item.nama_surat || 'Sumber Tidak Dikenal'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(item)}
                            className="text-slate-300 hover:text-emerald-500 transition"
                            title="Salin Teks"
                          >
                            {copiedId === item.id ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => toggleSaveItem(item)}
                            className={`transition ${savedItems.some(saved => saved.id === item.id) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
                            title={savedItems.some(saved => saved.id === item.id) ? "Hapus dari koleksi" : "Simpan ke koleksi"}
                          >
                            <Bookmark className={`w-5 h-5 ${savedItems.some(saved => saved.id === item.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {item.kutipan_arab && (
                        <div className="mb-4 text-right" dir="rtl">
                          <p className="font-amiri text-2xl leading-loose text-slate-800" style={{ fontFamily: "'Amiri', serif" }}>
                            {item.kutipan_arab}
                          </p>
                        </div>
                      )}

                      {item.terjemahan && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          "{item.terjemahan}"
                        </p>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          {item.brosur?.slug ? (
                            <Link href={`/${item.brosur.slug}`} target="_blank" className="hover:text-emerald-600 hover:underline transition" title="Baca brosur asli">
                              Dari: {item.brosur.judul}
                            </Link>
                          ) : (
                            <span>Dari: {item.brosur?.judul || 'Brosur Tidak Diketahui'}</span>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold group-hover:translate-x-1 transition-transform cursor-pointer"
                        >
                          Lihat Detail <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Popup Modal (Lihat Detail) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.sumber_jenis === 'quran' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                  {selectedItem.sumber_jenis === 'quran' ? <BookOpen className="w-5 h-5" /> : <BookMarked className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800">
                    {selectedItem.sumber_jenis === 'quran' ? "Ayat Al-Qur'an" : "Kutipan Hadist"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                    {selectedItem.rawi_kitab || selectedItem.nama_surat || 'Sumber Tidak Dikenal'} {selectedItem.no_hadist || selectedItem.ayat ? `— ${selectedItem.no_hadist || 'Ayat ' + selectedItem.ayat}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* Asal Brosur */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Asal Brosur</span>
                </div>
                {selectedItem.brosur?.slug ? (
                  <Link href={`/${selectedItem.brosur.slug}`} target="_blank" className="hover:text-emerald-600 transition group/link inline-flex items-center gap-2">
                    <h4 className="text-lg font-bold text-slate-800 group-hover/link:text-emerald-600 leading-tight underline decoration-emerald-300 decoration-2 underline-offset-4">
                      {selectedItem.brosur.judul}
                    </h4>
                  </Link>
                ) : (
                  <h4 className="text-lg font-bold text-slate-800 leading-tight">
                    {selectedItem.brosur?.judul || 'Judul Tidak Diketahui'}
                  </h4>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-500">
                  <span>Tema: {selectedItem.brosur?.tema || '-'}</span>
                  <span>Tanggal: {selectedItem.brosur?.tanggal_masehi || '-'}</span>
                </div>
              </div>

              {/* Status Validasi */}
              {selectedItem.sumber_jenis !== 'quran' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    {selectedItem.status_hadist === 'terverifikasi' ? (
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Sanad Terverifikasi
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 text-sm font-bold">
                        <AlertTriangle className="w-4 h-4" /> Status Belum Diverifikasi
                      </div>
                    )}
                    {selectedItem.derajat_hadist && (
                      <div className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-full border border-slate-200">
                        Derajat: {selectedItem.derajat_hadist}
                      </div>
                    )}
                  </div>
                  {selectedItem.status_hadist !== 'terverifikasi' && (
                    <p className="text-xs text-amber-600/90 font-medium pl-1 max-w-xl leading-relaxed">
                      *Catatan Sistem: Status "Belum Diverifikasi" berarti data ini baru diekstraksi secara otomatis dari arsip teks brosur, dan <span className="font-bold underline">jalur sanad/takhrij-nya belum ditinjau ulang secara manual</span> oleh dewan asatidzah.
                    </p>
                  )}
                </div>
              )}

              {/* Teks Arab */}
              {selectedItem.kutipan_arab && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Matan (Teks Asli)</h4>
                  <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm text-right" dir="rtl">
                    <p className="font-amiri text-3xl leading-loose text-slate-900" style={{ fontFamily: "'Amiri', serif" }}>
                      {selectedItem.kutipan_arab}
                    </p>
                  </div>
                </div>
              )}

              {/* Terjemahan */}
              {selectedItem.terjemahan && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Terjemahan</h4>
                  <p className="text-slate-700 text-lg leading-relaxed font-medium">
                    "{selectedItem.terjemahan}"
                  </p>
                </div>
              )}

              {/* Penjelasan/Konteks (Jika ada) */}
              {selectedItem.penjelasan && (
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2 text-blue-700">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Penjelasan/Konteks</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {selectedItem.penjelasan}
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium max-w-md leading-relaxed">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>
                  Referensi digital ini diawasi dan disesuaikan dengan kurikulum arsip Brosur Ahad Pagi MTA (Tinjauan Tim Ilmu).
                </span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
                >
                  Tutup
                </button>
                <button className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 text-white font-bold hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center justify-center gap-2">
                  <Bookmark className="w-4 h-4" /> Simpan Dalil
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
