'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSlug } from '../utils';
import {
  ChevronDown, Bookmark, Play, Copy, Share2,
  MoreHorizontal, Settings, Info, Search, List, Edit3, MessageCircle, FileText, BookOpen,
  X, Command, Pin, ClipboardList, Repeat, Languages, MessageSquareWarning, Settings2, Code, Image as ImageIcon, Video, Copy as CopyIcon, CheckCircle2, Home, Menu
} from 'lucide-react';

interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: {
    '01': string;
  };
}

interface SurahDetail {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  ayat: Ayat[];
}

const toArabicNumber = (num: number) => {
  return num.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
};

export default function SurahPage({ params, searchParams }: { params: Promise<{ slug: string[] }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const unwrappedParams = use(params);
  const unwrappedSearchParams = use(searchParams);
  const router = useRouter();
  const surahSlug = unwrappedParams.slug[0];
  const verseParam = unwrappedParams.slug[1] || unwrappedSearchParams.startingVerse;
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [allSurahs, setAllSurahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search state
  const [searchSurah, setSearchSurah] = useState('');
  const [searchAyat, setSearchAyat] = useState('');
  const [activeAyat, setActiveAyat] = useState<number | null>(null);
  const surahInputRef = useRef<HTMLInputElement>(null);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const initialTab = unwrappedSearchParams.tab === 'ayat' ? 'ayat' : 'surah';
  const [activeSidebarTab, setActiveSidebarTab] = useState<'surah' | 'ayat'>(initialTab);
  const [previewSurahId, setPreviewSurahId] = useState<number | null>(null);

  // Features state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeDropdownAyat, setActiveDropdownAyat] = useState<number | null>(null);
  const [shareModalAyat, setShareModalAyat] = useState<Ayat | null>(null);
  const [shareMode, setShareMode] = useState<'hanya_ayat' | 'ayat_dalam_surah'>('hanya_ayat');
  const [copiedLink, setCopiedLink] = useState(false);

  // Actions
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (ayat: Ayat) => {
    const textToCopy = `${ayat.teksArab}\n\n${ayat.teksIndonesia}\n\n(QS. ${surah?.namaLatin} ${surah?.nomor}:${ayat.nomorAyat})`;
    navigator.clipboard.writeText(textToCopy);
    showToast('Teks berhasil disalin');
  };

  const [isCopyRangeModalOpen, setIsCopyRangeModalOpen] = useState(false);
  const [copyRangeStart, setCopyRangeStart] = useState<number | ''>('');
  const [copyRangeEnd, setCopyRangeEnd] = useState<number | ''>('');

  const handleCopyRange = () => {
    if (!copyRangeStart || !copyRangeEnd || Number(copyRangeStart) > Number(copyRangeEnd)) return showToast('Range tidak valid');
    const start = Number(copyRangeStart);
    const end = Number(copyRangeEnd);
    
    const ayatsToCopy = surah?.ayat.filter(a => a.nomorAyat >= start && a.nomorAyat <= end);
    if (!ayatsToCopy || ayatsToCopy.length === 0) return showToast('Ayat tidak ditemukan');
    
    const textToCopy = ayatsToCopy.map(a => `${a.teksArab}\n\n${a.teksIndonesia}\n\n(QS. ${surah?.namaLatin} ${surah?.nomor}:${a.nomorAyat})`).join('\n\n---\n\n');
    navigator.clipboard.writeText(textToCopy);
    showToast(`Ayat ${start}-${end} berhasil disalin`);
    setIsCopyRangeModalOpen(false);
  };

  const handleEdit = () => {
    showToast('Anda belum login');
  };

  const handleCopyLink = () => {
    if (!surah || !shareModalAyat) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/quran/${createSlug(surah.namaLatin)}?startingVerse=${shareModalAyat.nomorAyat}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // First, fetch the list of all surahs to map the slug to an ID
        const listRes = await fetch('https://equran.id/api/v2/surat');
        const listData = await listRes.json();
        
        if (listData.code === 200) {
          setAllSurahs(listData.data);
          
          // Find the surah that matches the slug
          const matchedSurah = listData.data.find(
            (s: any) => createSlug(s.namaLatin) === surahSlug || s.nomor.toString() === surahSlug
          );
          
          if (matchedSurah) {
            // Now fetch the specific surah details using its ID
            const surahRes = await fetch(`https://equran.id/api/v2/surat/${matchedSurah.nomor}`);
            const surahData = await surahRes.json();
            
            if (surahData.code === 200) {
              setSurah(surahData.data);
            } else {
              setError(true);
            }
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching surah:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (surahSlug) {
      fetchData();
    }
  }, [surahSlug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isSidebarOpen) setIsSidebarOpen(true);
        setTimeout(() => surahInputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Initial scroll to active ayat from URL parameter (verseParam)
  useEffect(() => {
    if (surah && verseParam) {
      const verseStr = Array.isArray(verseParam) ? verseParam[0] : verseParam;
      const verseNum = parseInt(verseStr as string);
      if (!isNaN(verseNum)) {
        // Use requestAnimationFrame to ensure DOM is painted before scrolling
        requestAnimationFrame(() => {
          scrollToAyat(verseNum, true);
        });
      }
    }
  }, [surah, verseParam]);

  const scrollToAyat = (ayatNomor: number, instant = false) => {
    setActiveAyat(ayatNomor);
    const element = document.getElementById(`ayat-${ayatNomor}`);
    if (element) {
      element.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'center' });
    }
  };

  if (loading || error || !surah) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {loading ? <p className="text-zinc-400 font-medium">Memuat ayat...</p> : <p className="text-red-500">Gagal memuat data.</p>}
      </div>
    );
  }

  const filteredSurahs = allSurahs.filter(s => s.namaLatin.toLowerCase().includes(searchSurah.toLowerCase()));
  
  // Ayat preview logic
  const activePreviewId = previewSurahId || surah.nomor;
  const previewSurah = allSurahs.find(s => s.nomor === activePreviewId) || surah;
  const ayatsOfPreview = Array.from({ length: previewSurah.jumlahAyat }, (_, i) => i + 1);
  const filteredAyats = ayatsOfPreview.filter(n => n.toString().includes(searchAyat));

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">

      {/* TOP HEADER */}
      <header className="h-14 border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 bg-white z-20 text-sm">
        <div className="flex items-center gap-2">
          <Link href="/quran" className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors" title="Kembali ke Beranda Al-Quran">
            <Home size={18} />
          </Link>
          <div
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 p-2 rounded-md transition-colors"
          >
            {surah.nomor}. {surah.namaLatin}
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSidebarOpen ? '' : '-rotate-90'}`} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">

        {/* MOBILE OVERLAY */}
        {isSidebarOpen && (
          <div 
            className="md:hidden absolute inset-0 bg-black/20 z-20" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR WRAPPER */}
        <div className={`
          absolute md:relative z-30 md:z-10
          top-2 left-2 right-2 md:top-0 md:left-0 md:right-auto
          transition-all duration-300 ease-in-out shrink-0 overflow-hidden
          ${isSidebarOpen 
            ? 'h-[85vh] sm:h-[600px] md:h-[calc(100vh-56px)] md:w-[340px] opacity-100 translate-y-0 md:translate-y-0 md:translate-x-0' 
            : 'h-0 md:h-[calc(100vh-56px)] w-auto md:w-0 opacity-0 md:opacity-100 -translate-y-4 md:translate-y-0 md:-translate-x-full'}
        `}>
          <aside className="flex flex-col w-full md:w-[340px] rounded-2xl md:rounded-none border md:border-y-0 md:border-l-0 border-slate-200 h-full bg-white shadow-2xl md:shadow-none overflow-hidden">
            <div className="p-4 pt-4 md:pt-6">

              <div className="flex items-center gap-2 mb-4 md:mb-5">
                <div className="flex-1 relative flex items-center bg-slate-100 rounded-full p-1 isolate">
                  {/* Sliding Background */}
                  <div 
                    className="absolute top-1 bottom-1 transition-transform duration-300 ease-in-out z-0"
                    style={{
                      width: 'calc(50% - 2px)',
                      transform: `translateX(${['surah', 'ayat'].indexOf(activeSidebarTab) * 100}%)`
                    }}
                  >
                    <div className="w-full h-full bg-white rounded-full shadow-sm ring-1 ring-black/5"></div>
                  </div>

                  {/* Separators */}
                  {[0].map(idx => {
                    const activeIdx = ['surah', 'ayat'].indexOf(activeSidebarTab);
                    return (
                      <div 
                        key={idx}
                        className={`absolute top-1/2 -translate-y-1/2 w-[1px] h-4 bg-slate-300 transition-opacity duration-300 z-0 ${activeIdx === idx || activeIdx === idx + 1 ? 'opacity-0' : 'opacity-100'}`}
                        style={{ left: `${(idx + 1) * 50}%` }}
                      />
                    );
                  })}

                  {/* Tabs */}
                  {(['surah', 'ayat'] as const).map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveSidebarTab(tab)}
                      className={`flex-1 py-1.5 text-[14px] capitalize transition-colors relative z-10 ${activeSidebarTab === tab ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'}`}
                    >
                      {tab === 'ayat' ? 'Verse' : tab}
                    </button>
                  ))}
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:text-emerald-700 transition md:hidden shrink-0"><X size={20} strokeWidth={1.5} /></button>
              </div>

              <div className="hidden md:flex items-center justify-between text-[13px] text-slate-400 mb-6 px-1 italic">
                <span>Tips: coba navigasi dengan</span>
                <kbd className="bg-white border border-slate-200 rounded px-2 py-0.5 font-sans not-italic text-slate-500 shadow-sm flex items-center gap-1 text-[11px] font-bold">
                  <Command size={11} /> K
                </kbd>
              </div>

              <div className="flex gap-2 mb-2">
                <div className={`relative transition-all duration-300 ${activeSidebarTab === 'ayat' ? 'flex-[2]' : 'w-full'}`}>
                  <input
                    type="text"
                    ref={surahInputRef}
                    value={searchSurah}
                    onChange={(e) => setSearchSurah(e.target.value)}
                    placeholder="Cari Surah..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] md:text-[14px] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition text-slate-700 placeholder:text-slate-400 font-medium shadow-sm"
                  />
                </div>
                {activeSidebarTab === 'ayat' && (
                  <div className="relative flex-[1.2] transition-all duration-300">
                    <input
                      type="text"
                      value={searchAyat}
                      onChange={(e) => setSearchAyat(e.target.value)}
                      placeholder="Ayat"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] md:text-[14px] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition text-slate-700 placeholder:text-slate-400 font-medium shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                  {/* Surah List Column */}
                  <div className={`overflow-y-auto px-2 pb-4 space-y-[2px] custom-scrollbar transition-all duration-300 ${activeSidebarTab === 'ayat' ? 'flex-[2]' : 'flex-1 w-full'}`}>
                    {filteredSurahs.map((s) => (
                      activeSidebarTab === 'surah' ? (
                        <Link
                          key={s.nomor}
                          href={`/quran/${createSlug(s.namaLatin)}?tab=surah`}
                          className={`relative flex items-center gap-4 px-4 py-3 rounded-xl text-[14px] transition-colors ${s.nomor === surah.nomor ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                        >
                          <span className={`w-5 text-left ${s.nomor === surah.nomor ? 'text-emerald-700' : 'text-slate-400'}`}>{s.nomor}</span>
                          <span>{s.namaLatin}</span>
                          {s.nomor === surah.nomor && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-emerald-500 rounded-l-full" />
                          )}
                        </Link>
                      ) : (
                        <button
                          key={s.nomor}
                          onClick={() => setPreviewSurahId(s.nomor)}
                          className={`relative w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[14px] transition-colors ${s.nomor === activePreviewId ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                        >
                          <span className={`w-5 text-left ${s.nomor === activePreviewId ? 'text-emerald-700' : 'text-slate-400'}`}>{s.nomor}</span>
                          <span>{s.namaLatin}</span>
                          {s.nomor === activePreviewId && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-emerald-500 rounded-l-full" />
                          )}
                        </button>
                      )
                    ))}
                    {filteredSurahs.length === 0 && (
                      <div className="px-3 py-4 text-xs text-slate-400 font-medium text-center">Surah tidak ditemukan</div>
                    )}
                  </div>

                  {/* Ayat List Column */}
                  {activeSidebarTab === 'ayat' && (
                    <div className="flex-[1.2] overflow-y-auto px-2 pb-4 space-y-[2px] custom-scrollbar relative transition-all duration-300">
                      {filteredAyats.map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            if (activePreviewId === surah.nomor) {
                              window.history.pushState(null, '', `/quran/${createSlug(surah.namaLatin)}?startingVerse=${n}`);
                              scrollToAyat(n);
                              setIsSidebarOpen(false);
                            } else {
                              router.push(`/quran/${createSlug(previewSurah.namaLatin)}?tab=ayat&startingVerse=${n}`);
                              if (window.innerWidth < 1024) setIsSidebarOpen(false);
                            }
                          }}
                          className={`relative w-full text-left px-5 py-3 rounded-xl text-[14px] transition-colors ${activePreviewId === surah.nomor && activeAyat === n ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                        >
                          {n}
                          {activePreviewId === surah.nomor && activeAyat === n && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-emerald-500 rounded-r-full" />
                          )}
                        </button>
                      ))}
                      {filteredAyats.length === 0 && (
                        <div className="px-3 py-4 text-xs text-zinc-400 text-center">Ayat tidak ditemukan</div>
                      )}
                    </div>
                  )}
            </div>
          </aside>
        </div>


        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-56px)] bg-white scroll-smooth" id="main-content">
          <div className="max-w-4xl mx-auto p-4 md:p-8">

            {/* SURAH INFO CARD */}
            <div className="bg-[#f8f9fa] rounded-2xl p-6 mb-12 border border-zinc-100 relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-6">
                  <h1 className="font-amiri text-5xl font-bold text-emerald-800" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">
                    {surah.nama}
                  </h1>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{surah.nomor}. Surah {surah.namaLatin}</h2>
                      <span className="text-sm font-medium text-zinc-500">{surah.arti}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm leading-relaxed line-clamp-2">
                      Bacalah Surah {surah.namaLatin} dengan terjemahan, arti kata demi kata, dan transliterasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BISMILLAH */}
            {surah.nomor !== 1 && surah.nomor !== 9 && (
              <div className="text-center mb-12 space-y-3">
                <p className="font-amiri text-3xl md:text-4xl text-emerald-800" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <p className="text-xs text-zinc-500 font-medium">Dengan Nama Allah Yang Maha Pengasih dan Maha Penyayang</p>
              </div>
            )}

            {/* AYAT LIST */}
            <div className="space-y-12 pb-20">
              {surah.ayat.map((ayat) => (
                <div key={ayat.nomorAyat} id={`ayat-${ayat.nomorAyat}`} className="border-b border-zinc-100 pb-10 scroll-mt-20">
                  <div className="flex items-center justify-between mb-8">
                    {/* Left Actions */}
                    <div className="flex items-center gap-4 text-zinc-400">
                      <span className="font-medium text-lg text-zinc-500">{surah.nomor}:{ayat.nomorAyat}</span>
                    </div>
                    {/* Right Actions */}
                    <div className="flex items-center gap-4 text-zinc-400 relative">
                      <button onClick={() => handleCopy(ayat)} className="hover:text-teal-600 transition" title="Salin 1 Ayat"><Copy size={18} /></button>
                      <button onClick={() => {
                        setCopyRangeStart(ayat.nomorAyat);
                        setIsCopyRangeModalOpen(true);
                      }} className="hover:text-teal-600 transition" title="Salin Banyak Ayat">
                        <ClipboardList size={18} />
                      </button>
                      <button onClick={() => setShareModalAyat(ayat)} className="hover:text-teal-600 transition" title="Bagikan"><Share2 size={18} /></button>
                    </div>
                  </div>

                  {/* Arabic Text */}
                  <div className="text-right mb-8">
                    <p
                      className="font-amiri text-[28px] font-bold leading-loose text-slate-800"
                      style={{ fontFamily: "'Amiri', serif", lineHeight: "2.5" }}
                      dir="rtl"
                    >
                      {ayat.teksArab} <span className="inline-block mx-1 text-emerald-700">۝{toArabicNumber(ayat.nomorAyat)}</span>
                    </p>
                  </div>

                  {/* Translation */}
                  <div className="mb-6">
                    <p className="text-[17px] text-zinc-800 leading-relaxed font-medium">
                      {ayat.teksIndonesia}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>

      {/* SHARE MODAL */}
      {shareModalAyat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-[420px] w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShareModalAyat(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 transition bg-zinc-50 rounded-full p-1"
            >
              <X size={20} />
            </button>

            <h3 className="text-[26px] font-bold text-center mb-3 mt-2 text-black">Bagikan Al-Quran!</h3>
            <div className="text-center text-[15px] text-zinc-700 mb-6 px-4 leading-relaxed">
              <p>Nabi ﷺ bersabda:</p>
              <p className="font-bold text-black">'Sampaikanlah dariku, meskipun hanya satu ayat.'</p>
              <p>(HR. Al-Bukhari 3461)</p>
            </div>

            <div className="text-center text-xs text-zinc-500 mb-3">Tautan terbuka</div>
            <div className="flex bg-zinc-50/80 rounded-full p-1 mb-6 border border-zinc-200 shadow-sm">
              <button
                onClick={() => setShareMode('hanya_ayat')}
                className={`flex-1 py-2.5 rounded-full text-[14px] font-medium transition ${shareMode === 'hanya_ayat' ? 'bg-white shadow text-black border border-zinc-100' : 'text-zinc-500 hover:text-black'}`}
              >
                Hanya ayat
              </button>
              <button
                onClick={() => setShareMode('ayat_dalam_surah')}
                className={`flex-1 py-2.5 rounded-full text-[14px] font-medium transition ${shareMode === 'ayat_dalam_surah' ? 'bg-white shadow text-black border border-zinc-100' : 'text-zinc-500 hover:text-black'}`}
              >
                Ayat dalam surah
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-[13px] text-zinc-600 truncate focus-within:ring-2 focus-within:ring-teal-500/20">
                {typeof window !== 'undefined' ? window.location.origin : ''}/quran/{surah ? createSlug(surah.namaLatin) : ''}?startingVerse={shareModalAyat?.nomorAyat}
              </div>
              <button
                onClick={handleCopyLink}
                className="bg-[#3db199] hover:bg-[#349e88] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
              >
                {copiedLink ? <><CheckCircle2 size={16} /> Disalin</> : 'Salin tautan'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COPY RANGE MODAL */}
      {isCopyRangeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-bold text-lg text-zinc-800 flex items-center gap-2">
                <CopyIcon size={18} className="text-emerald-600" />
                Salin Banyak Ayat
              </h3>
              <button
                onClick={() => setIsCopyRangeModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Dari Ayat</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={surah?.jumlahAyat}
                    value={copyRangeStart}
                    onChange={(e) => setCopyRangeStart(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="1"
                  />
                </div>
                <div className="text-zinc-300 font-bold mt-5">-</div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Sampai Ayat</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={surah?.jumlahAyat}
                    value={copyRangeEnd}
                    onChange={(e) => setCopyRangeEnd(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder={surah?.jumlahAyat.toString()}
                  />
                </div>
              </div>
              
              <button
                onClick={handleCopyRange}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <CopyIcon size={18} /> Salin Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 text-sm font-medium transition-all animate-in slide-in-from-bottom-5 fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
