'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, BookOpen, Bookmark,
  Menu, MessageSquare, Settings, Sparkles, X,
  ArrowLeft, FileText, ChevronRight, Info,
  CheckCircle2, AlertTriangle, BookMarked, Copy, Check, Share2,
  TrendingUp, Loader2, Users, ScrollText, CalendarDays, BrainCircuit, Key
} from 'lucide-react';
import { motion } from 'framer-motion';
import MainSidebar from '@/app/components/MainSidebar';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';
import AccessCodeModal from '@/app/components/AccessCodeModal';
import { buildHighlightSpans } from '@/utils/searchHelper';

const HighlightText = ({ text, highlight }: { text: string; highlight: string | string[] }) => {
  if (!text) return <>{text}</>;

  const spans = buildHighlightSpans(text, highlight);
  if (!spans || spans.length === 0) return <>{text}</>;

  return (
    <>
      {spans.map((span, i) =>
        span.isMatch ? (
          <mark
            key={i}
            className="bg-amber-300 text-amber-950 font-bold px-1 rounded shadow-xs mx-0.5 inline-block"
          >
            {span.text}
          </mark>
        ) : (
          <span key={i}>{span.text}</span>
        )
      )}
    </>
  );
};

export default function MakkahPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchMeta, setSearchMeta] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isShowingSaved, setIsShowingSaved] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [featuredBrosurItem, setFeaturedBrosurItem] = useState<any | null>(null);
  const [showBrosurPopup, setShowBrosurPopup] = useState(false);

  // AI Integration States
  const [searchMode, setSearchMode] = useState<'dalil' | 'ai'>('dalil');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [pendingAiQuery, setPendingAiQuery] = useState('');
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const getBrosurUrl = (brosur: any, query?: string, scrollText?: string) => {
    if (!brosur) return '#';
    const tahun = brosur.tahun || 2026;
    const slug =
      brosur.slug ||
      brosur.id ||
      (brosur.judul ? brosur.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '');
    let url = `/bap/${tahun}/${encodeURIComponent(slug)}`;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (scrollText) {
      const cleanScroll = scrollText.replace(/[\n\r]+/g, ' ').trim().substring(0, 300);
      params.set('scroll', cleanScroll);
    }
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  };

  const activeHighlightTerms = React.useMemo(() => {
    const list: string[] = [];
    if (searchMeta?.highlight_terms && Array.isArray(searchMeta.highlight_terms)) {
      list.push(...searchMeta.highlight_terms);
    }
    if (searchMeta?.search_terms_used && Array.isArray(searchMeta.search_terms_used)) {
      list.push(...searchMeta.search_terms_used);
    }
    if (searchMeta?.query_koreksi) {
      list.push(searchMeta.query_koreksi);
    }
    if (searchMeta?.originalQuery) {
      list.push(searchMeta.originalQuery);
    }
    if (searchMeta?.kata_kunci_konteks) {
      list.push(...searchMeta.kata_kunci_konteks.split(' '));
    }
    if (searchQuery) {
      list.push(searchQuery);
    }
    return list;
  }, [searchMeta, searchQuery]);

  const getShareText = (item: any) => {
    const sumber = item.sumber_jenis === 'quran'
      ? `QS. ${item.nama_surat || ''} : ${item.ayat || ''}`
      : `HR. ${item.rawi_kitab || ''} ${item.no_hadist ? 'no. ' + item.no_hadist : ''}`;

    const sumberBrosur = item.brosur?.judul ? `\nPustaka - Dari: ${item.brosur.judul}` : '';

    return `${item.kutipan_arab ? item.kutipan_arab + '\n\n' : ''}${item.terjemahan ? '"' + item.terjemahan + '"\n\n' : ''}[ ${sumber.trim()} ]${sumberBrosur}`;
  };

  const handleCopy = (item: any) => {
    navigator.clipboard.writeText(getShareText(item));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load history & access status dari LocalStorage saat pertama kali render
  useEffect(() => {
    const savedHistory = localStorage.getItem('makkah_search_history');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
    const savedDalil = localStorage.getItem('makkah_saved_dalil');
    let parsedSaved = [];
    if (savedDalil) {
      parsedSaved = JSON.parse(savedDalil);
      setSavedItems(parsedSaved);
    }

    const premiumCode = localStorage.getItem('mta_premium_access');
    if (premiumCode) {
      setHasPremiumAccess(true);
    }

    if (pathname === '/tersimpan') {
      setIsShowingSaved(true);
      setSearchResults(parsedSaved);
    } else {
      setIsShowingSaved(false);

      // Sinkronisasi dengan URL search parameter saat pertama kali dimuat
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const q = urlParams.get('q');
        if (q) {
          // Lakukan pencarian awal jika ada param 'q' di URL
          setSearchQuery(q);
          setTimeout(() => handleSearch(q, false), 100);
        }
      }
    }
  }, [pathname]);

  const handleAccessCodeSuccess = (code: string) => {
    setHasPremiumAccess(true);
    setIsAccessModalOpen(false);
    if (pendingAiQuery) {
      const q = pendingAiQuery;
      setPendingAiQuery('');
      router.push(`/ai-pustaka?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/ai-pustaka');
    }
  };

  const handleSearch = async (query: string, updateUrl = true, overrideMode?: 'dalil' | 'ai') => {
    if (!query.trim()) return;
    const currentMode = overrideMode || searchMode;

    if (currentMode === 'ai') {
      router.push(`/ai-pustaka?q=${encodeURIComponent(query.trim())}`);
      return;
    }

    setIsShowingSaved(false);
    setVisibleCount(10);

    if (updateUrl && typeof window !== 'undefined') {
      const newUrl = pathname + '?q=' + encodeURIComponent(query);
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }

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
        const meta = data.search_meta || {};
        const items = data.items || [];
        setSearchResults(items);
        setSearchSuggestions(data.suggestions || []);
        setSearchMeta({
          originalQuery: meta.original_query || query.trim(),
          query_koreksi: meta.corrected_query || data.ai_data?.query_koreksi || null,
          has_correction: meta.has_correction || false,
          kata_kunci_konteks: data.ai_data?.kata_kunci_konteks || null,
          search_terms_used: data.search_terms_used || [],
          highlight_terms: meta.highlight_terms || data.highlight_terms || []
        });

        // Deteksi brosur yang paling relevan untuk popup rekomendasi
        if (items.length > 0) {
          const cleanQ = query.toLowerCase().trim();
          const matched = items.find((it: any) =>
            it.brosur?.judul && it.brosur.judul.toLowerCase().includes(cleanQ)
          );
          const targetItem = matched || items.find((it: any) => it.brosur?.judul) || items[0];
          if (targetItem?.brosur) {
            setFeaturedBrosurItem(targetItem);
            setShowBrosurPopup(true);
          } else {
            setFeaturedBrosurItem(null);
            setShowBrosurPopup(false);
          }
        } else {
          setFeaturedBrosurItem(null);
          setShowBrosurPopup(false);
        }
      } else {
        setSearchResults([]);
        setSearchSuggestions([]);
        setSearchMeta(null);
        setFeaturedBrosurItem(null);
        setShowBrosurPopup(false);
      }
    } catch (e) {
      console.error('Error fetching search results:', e);
      setSearchResults([]);
      setSearchSuggestions([]);
      setSearchMeta(null);
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
    setSearchSuggestions([]);
    setSearchMeta(null);
    setIsShowingSaved(false);
    setVisibleCount(10);
    if (typeof window !== 'undefined') {
      window.history.replaceState({ ...window.history.state, as: '/', url: '/' }, '', '/');
    }
    if (pathname !== '/') {
      router.push('/');
    }
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
      .then(res => {
        if (!res.ok) return { topics: [] };
        return res.json();
      })
      .then(data => {
        if (data && data.topics && data.topics.length > 0) {
          setPopularTopics(data.topics);
        }
      })
      .catch(err => {
        // Fallback default
        setPopularTopics([]);
      });
  }, []);

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">

      {/* Sidebar Global */}
      <MainSidebar
        savedItemsCount={savedItems.length}
        onSearchClick={resetSearch}
        onHistoryClick={(history) => handleSearch(history)}
      />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col relative h-full bg-white/50 overflow-y-auto">
        {/* Header Toggle */}
        <header className="h-16 sticky top-0 left-0 right-0 px-4 flex items-center justify-between z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/50 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-main-sidebar'))}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition shadow-sm cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            {searchResults !== null && (
              <button
                onClick={resetSearch}
                className="p-2 text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <HeaderUserDropdown />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center p-6">

          {/* Default Welcome Screen */}
          {searchResults === null && !isShowingSaved && !isSearching ? (
            <div className="w-full max-w-2xl text-center space-y-6 mt-12 sm:mt-16">
              {/* Welcome Greeting */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold mb-1">
                  Ahlan wa Sahlan
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                  Selamat Datang, Ustadz.
                </h2>
                <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto">
                  Silakan cari dalil, ayat, atau referensi brosur untuk kajian hari ini.
                </p>
              </div>

              {/* Huge Search Bar */}
              <div className="relative group max-w-xl mx-auto">
                <div className="absolute -inset-1 bg-emerald-500/10 blur-xl rounded-3xl transition duration-500 opacity-0 group-focus-within:opacity-100" />
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery, true, 'dalil'); }}
                  className="relative flex items-center bg-white border-2 border-slate-200 rounded-2xl p-2 shadow-sm focus-within:border-emerald-500 focus-within:shadow-md transition-all"
                >
                  <div className="pl-4 pr-2 text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-transparent border-none text-base sm:text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none py-3"
                    placeholder="Ketik kata kunci atau tema kajian..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="p-2 text-slate-400 hover:text-slate-600 transition cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="ml-2 px-5 sm:px-6 py-3 font-bold rounded-xl transition shadow-xs disabled:opacity-70 flex items-center justify-center min-w-[105px] cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Cari'
                    )}
                  </button>
                </form>
              </div>

              {/* Single Clean "Tanya AI Sahabat MTA" Action Button */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const q = searchQuery.trim();
                    router.push(q ? `/ai-pustaka?q=${encodeURIComponent(q)}` : '/ai-pustaka');
                  }}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 rounded-2xl text-sm font-normal shadow-2xs transition cursor-pointer group"
                >
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span>Tanya AI Sahabat MTA</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* Quick Suggestions */}
              {popularTopics.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Saran Topik Pencarian Populer</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {popularTopics.map((topic, i) => (
                      <div key={i} className="relative">
                        <button
                          type="button"
                          onClick={() => handleSearch(topic.name, true, 'dalil')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 rounded-full text-sm font-medium transition shadow-sm cursor-pointer"
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
                    {isShowingSaved ? "Dalil Tersimpan" : `Hasil untuk "${searchMeta?.query_koreksi || searchQuery}"`}
                  </h3>
                  {searchMeta?.has_correction && searchMeta.query_koreksi && (
                    <div className="inline-flex items-center gap-2 mt-2 bg-amber-50/90 border border-amber-200 rounded-full px-3.5 py-1 text-amber-900 text-xs shadow-xs text-left max-w-full">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">
                        Hasil untuk: <strong className="font-bold underline decoration-amber-500">{searchMeta.query_koreksi}</strong>{' '}
                        <span className="text-amber-700/75">(typo dari &lsquo;{searchMeta.originalQuery}&rsquo;)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSearch(searchMeta.originalQuery)}
                        className="text-[11px] text-amber-800 underline hover:text-amber-950 font-medium shrink-0 ml-1 cursor-pointer"
                      >
                        Cari &lsquo;{searchMeta.originalQuery}&rsquo;
                      </button>
                    </div>
                  )}
                  {searchMeta?.query_koreksi && !searchMeta.has_correction && searchMeta.query_koreksi.toLowerCase() !== searchMeta.originalQuery.toLowerCase() && (
                    <p className="text-sm text-emerald-600 mt-1 font-medium">
                      Menampilkan hasil untuk: <strong>{searchMeta.query_koreksi}</strong>
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-2">
                    {isShowingSaved ? `Ada ${searchResults?.length || 0} dalil dalam koleksi Anda` : `Ditemukan ${searchResults?.length || 0} dalil yang relevan`}
                  </p>
                </div>
              </div>

              {/* AI Assistance Banner */}
              {!isShowingSaved && searchQuery && (
                <div className="bg-gradient-to-r from-emerald-50/90 via-white to-slate-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        Butuh penjelasan mendalam tentang &ldquo;{searchQuery}&rdquo;?
                      </p>
                      <p className="text-xs text-slate-500">
                        AI Sahabat MTA dapat merangkum dalil dan menjawab pertanyaan materi kajian Anda berdasarkan ratusan brosur resmi.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const aiPrompt = `Jelaskan dalil dan kesimpulan materi tentang ${searchQuery}`;
                      const hasCode = typeof window !== 'undefined' && localStorage.getItem('mta_premium_access');
                      if (!hasCode) {
                        setPendingAiQuery(aiPrompt);
                        setIsAccessModalOpen(true);
                      } else {
                        router.push(`/ai-pustaka?q=${encodeURIComponent(aiPrompt)}`);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>Tanya AI Pustaka</span>
                  </button>
                </div>
              )}

              {/* Results List */}
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-32 text-emerald-600 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="font-semibold text-slate-600 animate-pulse text-lg">
                    Menelusuri perpustakaan...
                  </p>
                </div>
              ) : searchResults?.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-400 rounded-full mb-4">
                    <Search className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-700">Tidak Ditemukan</h4>
                  <p className="text-slate-500 mt-1 mb-8">Coba gunakan kata kunci lain atau sinonim.</p>

                  {searchSuggestions && searchSuggestions.length > 0 && (
                    <div className="max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left shadow-sm">
                      <div className="flex items-center gap-2 mb-4 text-amber-800">
                        <Sparkles className="w-5 h-5" />
                        <h4 className="font-bold text-lg">Apakah yang Anda maksud tentang:</h4>
                      </div>
                      <div className="flex flex-col gap-3">
                        {searchSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              const cleanSuggestion = suggestion.split(' (')[0];
                              handleSearch(cleanSuggestion);
                            }}
                            className="flex items-center justify-between px-4 py-3 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-xl transition text-left group"
                          >
                            <span className="text-amber-900 font-medium text-sm">{suggestion}</span>
                            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pb-20">
                  {(searchResults || []).slice(0, visibleCount).map((item, idx) => (
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
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareText(item))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-300 hover:text-[#25D366] transition"
                            title="Bagikan ke WhatsApp"
                          >
                            <Share2 className="w-5 h-5" />
                          </a>
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
                          <p className="font-amiri text-[28px] leading-[2.5] text-slate-800" style={{ fontFamily: "'Amiri', serif" }}>
                            <HighlightText text={item.kutipan_arab} highlight={activeHighlightTerms} />
                          </p>
                        </div>
                      )}

                      {item.terjemahan && (
                        <p className="text-[17px] text-slate-600 leading-relaxed font-medium">
                          "<HighlightText text={item.terjemahan} highlight={activeHighlightTerms} />"
                        </p>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          {item.brosur ? (
                            <Link
                              href={getBrosurUrl(item.brosur, searchQuery, item.kutipan_arab || item.terjemahan)}
                              className="hover:text-emerald-600 hover:underline transition truncate"
                              title="Baca brosur asli"
                            >
                              Dari: {item.brosur.judul}
                            </Link>
                          ) : (
                            <span className="truncate">Dari: {item.brosur_id || 'Brosur Tidak Diketahui'}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {item.brosur && (
                            <Link
                              href={getBrosurUrl(item.brosur, searchQuery, item.kutipan_arab || item.terjemahan)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs transition border border-emerald-200/60"
                              title="Buka naskah brosur asli"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Menuju Brosur</span>
                            </Link>
                          )}
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold group-hover:translate-x-1 transition-transform cursor-pointer px-2 py-1.5"
                          >
                            Lihat Detail <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {visibleCount < (searchResults?.length || 0) && (
                    <div className="pt-6 pb-4 flex justify-center">
                      <button
                        onClick={() => setVisibleCount(prev => prev + 10)}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-semibold transition shadow-sm"
                      >
                        Tampilkan Lebih Banyak ({(searchResults?.length || 0) - visibleCount} tersisa)
                      </button>
                    </div>
                  )}
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
                  <Link href={`/${selectedItem.brosur.slug}?q=${encodeURIComponent(searchQuery || '')}&scroll=${encodeURIComponent((selectedItem.kutipan_arab || selectedItem.terjemahan || '').substring(0, 1000))}`} className="hover:text-emerald-600 transition group/link inline-flex items-center gap-2">
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
                      {/* *Catatan Sistem: Status "Belum Diverifikasi" berarti data ini baru diekstraksi secara otomatis dari arsip teks brosur, dan <span className="font-bold underline">jalur sanad/takhrij-nya belum ditinjau ulang secara manual</span> oleh dewan asatidzah. */}
                    </p>
                  )}
                </div>
              )}

              {/* Teks Arab */}
              {selectedItem.kutipan_arab && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Matan (Teks Asli)</h4>
                  <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm text-right" dir="rtl">
                    <p className="font-amiri text-[28px] leading-[2.5] text-slate-900" style={{ fontFamily: "'Amiri', serif" }}>
                      <HighlightText text={selectedItem.kutipan_arab} highlight={activeHighlightTerms} />
                    </p>
                  </div>
                </div>
              )}

              {/* Terjemahan */}
              {selectedItem.terjemahan && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Terjemahan</h4>
                  <p className="text-slate-700 text-[17px] leading-relaxed font-medium">
                    "<HighlightText text={selectedItem.terjemahan} highlight={activeHighlightTerms} />"
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
                  className="flex-1 sm:flex-none px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                {selectedItem.brosur && (
                  <Link
                    href={getBrosurUrl(
                      selectedItem.brosur,
                      searchQuery,
                      selectedItem.kutipan_arab || selectedItem.terjemahan
                    )}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 text-white font-bold hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Menuju Brosur Asli</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
                <button
                  onClick={() => toggleSaveItem(selectedItem)}
                  className="p-2.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition border border-slate-200"
                  title={savedItems.some(saved => saved.id === selectedItem.id) ? "Hapus dari koleksi" : "Simpan ke koleksi"}
                >
                  <Bookmark className={`w-4 h-4 ${savedItems.some(saved => saved.id === selectedItem.id) ? 'fill-current text-amber-500' : ''}`} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Popup Cerdas Brosur Terkait (Clean, Lebar di Desktop, No Gradient) */}
      {showBrosurPopup && featuredBrosurItem?.brosur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Header Popup Clean & Solid (No Gradient) */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 bg-white relative flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0 pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <BookOpen className="w-3.5 h-3.5" /> Brosur Terkait
                  </span>
                  {featuredBrosurItem.brosur.tahun && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                      Tahun {featuredBrosurItem.brosur.tahun}
                    </span>
                  )}
                  {featuredBrosurItem.brosur.folders?.name && (
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      • {featuredBrosurItem.brosur.folders.name}
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {featuredBrosurItem.brosur.judul}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowBrosurPopup(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer shrink-0"
                aria-label="Tutup popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Popup Clean & Lebar di Desktop */}
            <div className="p-6 sm:px-8 py-5 overflow-y-auto space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Cuplikan Dalil Terkait &ldquo;{searchQuery}&rdquo;
                  </span>
                  {featuredBrosurItem.rawi_kitab && (
                    <span className="text-xs font-semibold text-slate-500">
                      {featuredBrosurItem.rawi_kitab} {featuredBrosurItem.no_hadist ? `No. ${featuredBrosurItem.no_hadist}` : ''}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-slate-700 leading-relaxed max-h-60 overflow-y-auto">
                  {featuredBrosurItem.kutipan_arab && (
                    <p className="font-amiri text-xl sm:text-2xl text-right text-slate-900 mb-3 leading-loose" dir="rtl">
                      <HighlightText text={featuredBrosurItem.kutipan_arab} highlight={activeHighlightTerms} />
                    </p>
                  )}
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
                    &ldquo;<HighlightText text={featuredBrosurItem.terjemahan || ''} highlight={activeHighlightTerms} />&rdquo;
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-600">
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Naskah lengkap brosur ini memuat konteks penuh, uraian dalil-dalil, dan pembahasan tuntas tentang topik ini.
                </span>
              </div>
            </div>

            {/* Footer Popup Clean & Solid (No Gradient) */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowBrosurPopup(false)}
                className="w-full sm:w-auto py-2.5 px-4 text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 font-semibold rounded-xl text-xs transition cursor-pointer text-center"
              >
                Lihat Semua Dalil ({searchResults?.length || 0})
              </button>

              <Link
                href={getBrosurUrl(
                  featuredBrosurItem.brosur,
                  searchQuery,
                  featuredBrosurItem.kutipan_arab || featuredBrosurItem.terjemahan
                )}
                onClick={() => setShowBrosurPopup(false)}
                className="w-full sm:w-auto py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-sm text-center group cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Menuju Brosur Lengkap</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Access Code Modal untuk aktivasi fitur AI & Premium */}
      <AccessCodeModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onSuccess={handleAccessCodeSuccess}
      />

    </div>
  );
}
