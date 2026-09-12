'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import {
  ChevronDown, Bookmark, Play, Copy, Share2,
  MoreHorizontal, Settings, Info, Search, List, Edit3, MessageCircle, FileText, BookOpen,
  X, Command, Pin, ClipboardList, Repeat, Languages, MessageSquareWarning, Settings2, Code, Image as ImageIcon, Video, Copy as CopyIcon, CheckCircle2
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

export default function SurahPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const handleEdit = () => {
    showToast('Anda belum login');
  };

  const handleCopyLink = () => {
    if (!surah || !shareModalAyat) return;
    navigator.clipboard.writeText(`https://quran.com/id/${surah.namaLatin.toLowerCase()}/${shareModalAyat.nomorAyat}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [surahRes, listRes] = await Promise.all([
          fetch(`https://equran.id/api/v2/surat/${id}`),
          fetch('https://equran.id/api/v2/surat')
        ]);
        if (!surahRes.ok || !listRes.ok) throw new Error('Gagal memuat data');
        const surahData = await surahRes.json();
        const listData = await listRes.json();
        setSurah(surahData.data);
        setAllSurahs(listData.data);
      } catch (err) {
        console.error("Error fetching detail surah:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

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

  const scrollToAyat = (nomorAyat: number) => {
    setActiveAyat(nomorAyat);
    const el = document.getElementById(`ayat-${nomorAyat}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const filteredAyats = surah.ayat.filter(a => a.nomorAyat.toString().includes(searchAyat));

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">

      {/* TOP HEADER */}
      <header className="h-14 border-b border-zinc-200 flex items-center justify-between px-4 sticky top-0 bg-white z-20 text-sm">
        <div
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-2 cursor-pointer font-bold hover:bg-zinc-50 p-2 rounded-md transition-colors"
        >
          {surah.nomor}. {surah.namaLatin}
          <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isSidebarOpen ? '' : '-rotate-90'}`} />
        </div>

        <div className="hidden md:flex items-center gap-2 text-zinc-500 text-xs font-medium">
          <Bookmark size={14} />
          <span>Halaman — Juz — / Hizb —</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-zinc-100 rounded-full p-1 border border-zinc-200">
            <button className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
              <List size={14} /> Ayat demi Ayat
            </button>
            <button className="px-3 py-1 rounded-full text-xs font-medium text-zinc-500 flex items-center gap-1 hover:text-zinc-700">
              <FileText size={14} /> Membaca
            </button>
          </div>
          <button className="text-teal-600 hover:text-teal-700"><Settings size={18} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        {/* SIDEBAR WRAPPER (for smooth animation) */}
        <div className={`hidden md:block transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${isSidebarOpen ? 'w-[340px] opacity-100' : 'w-0 opacity-0'}`}>
          <aside className="flex flex-col w-[340px] border-r border-zinc-200 h-[calc(100vh-56px)] sticky top-14 bg-white z-10">
            <div className="p-4 pt-6">

              <div className="flex items-center gap-1 text-sm font-medium bg-zinc-100/80 rounded-full p-1 mb-5">
                <button className="flex-1 py-1.5 text-zinc-500 rounded-full hover:text-black transition">Surah</button>
                <button className="flex-1 py-1.5 bg-white shadow-sm text-black rounded-full font-bold">Ayat</button>
                <button className="flex-1 py-1.5 text-zinc-500 rounded-full hover:text-black transition">Juz</button>
                <button className="flex-1 py-1.5 text-zinc-500 rounded-full hover:text-black transition hidden lg:block">Halaman</button>
                <button className="px-2 text-zinc-400 hover:text-black transition"><X size={16} /></button>
              </div>

              <div className="flex items-center justify-between text-[13px] text-zinc-400 mb-6 px-1 italic">
                <span>Tips: coba navigasi dengan</span>
                <kbd className="bg-white border border-zinc-200 rounded px-2 py-0.5 font-sans not-italic text-zinc-600 shadow-sm flex items-center gap-1 text-[11px] font-medium">
                  <Command size={11} /> K
                </kbd>
              </div>

              <div className="flex gap-2 mb-2">
                <div className="relative flex-[2]">
                  <input
                    type="text"
                    ref={surahInputRef}
                    value={searchSurah}
                    onChange={(e) => setSearchSurah(e.target.value)}
                    placeholder="Cari Surah"
                    className="w-full bg-zinc-100/80 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:bg-zinc-200 transition text-zinc-600 placeholder:text-zinc-400"
                  />
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchAyat}
                    onChange={(e) => setSearchAyat(e.target.value)}
                    placeholder="Ayat"
                    className="w-full bg-zinc-100/80 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:bg-zinc-200 transition text-zinc-600 placeholder:text-zinc-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Surah List Column */}
              <div className="flex-[2] overflow-y-auto px-2 pb-4 space-y-[2px]">
                {filteredSurahs.map((s) => (
                  <Link
                    key={s.nomor}
                    href={`/quran/${s.nomor}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${s.nomor === surah.nomor ? 'bg-zinc-100/80 font-bold text-black' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    <span className={`w-5 text-left ${s.nomor === surah.nomor ? 'text-black' : 'text-zinc-500'}`}>{s.nomor}</span>
                    <span>{s.namaLatin}</span>
                  </Link>
                ))}
                {filteredSurahs.length === 0 && (
                  <div className="px-3 py-4 text-xs text-zinc-400 text-center">Surah tidak ditemukan</div>
                )}
              </div>

              {/* Ayat List Column */}
              <div className="flex-[1.2] overflow-y-auto px-2 pb-4 space-y-[2px] border-l border-zinc-100 relative">
                {surah.ayat.length > 0 && <div className="absolute right-1 top-4 w-1.5 h-16 bg-zinc-200 rounded-full" />}

                {filteredAyats.map((a) => (
                  <button
                    key={a.nomorAyat}
                    onClick={() => scrollToAyat(a.nomorAyat)}
                    className={`w-full text-left px-5 py-2.5 rounded-xl text-[14px] transition-colors ${activeAyat === a.nomorAyat ? 'bg-zinc-100/80 font-bold text-black' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    {a.nomorAyat}
                  </button>
                ))}
                {filteredAyats.length === 0 && (
                  <div className="px-3 py-4 text-xs text-zinc-400 text-center">Ayat tidak ditemukan</div>
                )}
              </div>
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
                  <h1 className="text-5xl font-bold" style={{ fontFamily: "var(--font-amiri), serif" }}>
                    {surah.nama}
                  </h1>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{surah.nomor}. Surah {surah.namaLatin}</h2>
                      <span className="text-sm font-medium text-zinc-500">{surah.arti}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm leading-relaxed line-clamp-2">
                      Bacalah dan dengarkan Surah {surah.namaLatin} dengan terjemahan, tafsir, pembacaan audio, arti kata demi kata, dan transliterasi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <div className="flex gap-2">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-zinc-200 rounded-full px-4 py-1.5 text-xs font-bold hover:bg-zinc-50 transition">
                      <Play size={12} className="text-teal-600" /> Mendengarkan
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-zinc-200 rounded-full px-4 py-1.5 text-xs font-bold hover:bg-zinc-50 transition">
                      <Info size={12} className="text-teal-600" /> informasi
                    </button>
                  </div>
                  <button className="w-full flex items-center justify-between bg-white border border-zinc-200 rounded-full px-4 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 transition">
                    <span>Terjemahan: Kemenag RI</span> <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* BISMILLAH */}
            {surah.nomor !== 1 && surah.nomor !== 9 && (
              <div className="text-center mb-12 space-y-3">
                <p className="text-3xl md:text-4xl" style={{ fontFamily: "var(--font-amiri), serif" }}>
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
                      <button className="hover:text-teal-600 transition"><Play size={18} /></button>
                      <button className="hover:text-teal-600 transition"><Bookmark size={18} /></button>
                    </div>
                    {/* Right Actions */}
                    <div className="flex items-center gap-4 text-zinc-400 relative">
                      <button onClick={() => handleCopy(ayat)} className="hover:text-teal-600 transition" title="Salin"><Copy size={18} /></button>
                      <button onClick={() => setShareModalAyat(ayat)} className="hover:text-teal-600 transition" title="Bagikan"><Share2 size={18} /></button>
                      <button onClick={handleEdit} className="hover:text-teal-600 transition" title="Edit"><Edit3 size={18} /></button>
                      <button
                        onClick={() => setActiveDropdownAyat(activeDropdownAyat === ayat.nomorAyat ? null : ayat.nomorAyat)}
                        className="hover:text-teal-600 transition"
                        title="Lainnya"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdownAyat === ayat.nomorAyat && (
                        <div className="absolute right-0 top-8 w-[250px] bg-white border border-zinc-200 rounded-2xl shadow-xl z-30 py-2 flex flex-col text-[14px] text-zinc-700 font-medium">
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><Pin size={16} className="text-zinc-400" /> Sematkan & Bandingkan</button>
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><ClipboardList size={16} className="text-zinc-400" /> Salinan Lanjutan</button>
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><Search size={16} className="text-zinc-400" /> Kata per kata</button>
                          <div className="h-px bg-zinc-100 my-1 mx-2"></div>
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><Repeat size={16} className="text-zinc-400" /> Ulangi Ayat</button>
                          <div className="h-px bg-zinc-100 my-1 mx-2"></div>
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><Languages size={16} className="text-zinc-400" /> Terjemahan</button>
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><MessageSquareWarning size={16} className="text-zinc-400" /> Umpan Balik Terjemahan</button>
                          <div className="h-px bg-zinc-100 my-1 mx-2"></div>
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><Code size={16} className="text-zinc-400" /> Sematkan Widget</button>
                          <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition w-full text-left"><Settings2 size={16} className="text-zinc-400" /> Pengaturan</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arabic Text */}
                  <div className="text-right mb-8">
                    <p
                      className="text-3xl md:text-4xl font-bold leading-loose text-zinc-900"
                      style={{ fontFamily: "var(--font-amiri), serif", lineHeight: "2.5" }}
                      dir="rtl"
                    >
                      {ayat.teksArab} <span className="inline-block mx-1">۝{toArabicNumber(ayat.nomorAyat)}</span>
                    </p>
                  </div>

                  {/* Translation */}
                  <div className="mb-6">
                    <p className="text-[15px] text-zinc-800 leading-relaxed font-medium">
                      {ayat.teksIndonesia}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center gap-6 text-xs font-bold text-zinc-400">
                    <button className="flex items-center gap-1.5 hover:text-teal-600 transition"><BookOpen size={14} /> Tafsir</button>
                    <button className="flex items-center gap-1.5 hover:text-teal-600 transition"><BookOpen size={14} /> Pelajaran</button>
                    <button className="flex items-center gap-1.5 hover:text-teal-600 transition"><MessageCircle size={14} /> Refleksi</button>
                    <button className="flex items-center gap-1.5 hover:text-teal-600 transition"><BookOpen size={14} /> Hadits</button>
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

            <div className="flex items-center gap-2 mb-8">
              <div className="flex-1 bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-[13px] text-zinc-600 truncate focus-within:ring-2 focus-within:ring-teal-500/20">
                https://quran.com/id/{surah?.namaLatin.toLowerCase()}/{shareModalAyat.nomorAyat}
              </div>
              <button
                onClick={handleCopyLink}
                className="bg-[#3db199] hover:bg-[#349e88] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
              >
                {copiedLink ? <><CheckCircle2 size={16} /> Disalin</> : 'Salin tautan'}
              </button>
            </div>

            <div className="flex justify-between px-1 mb-8">
              <button className="flex flex-col items-center gap-2 text-[11px] font-medium text-black group">
                {/* <div className="w-[52px] h-[52px] rounded-full bg-black flex items-center justify-center text-white group-hover:scale-105 transition shadow-md"><Facebook size={26} strokeWidth={1.5} /></div> */}
                Facebook
              </button>
              <button className="flex flex-col items-center gap-2 text-[11px] font-medium text-black group">
                {/* <div className="w-[52px] h-[52px] rounded-full bg-black flex items-center justify-center text-white group-hover:scale-105 transition shadow-md"><Twitte size={24} fill="currentColor" strokeWidth={0} /></div> */}
                X
              </button>
              <button className="flex flex-col items-center gap-2 text-[11px] font-medium text-black group">
                <div className="w-[52px] h-[52px] rounded-full bg-black flex items-center justify-center text-white group-hover:scale-105 transition shadow-md">
                  <svg className="w-[26px] h-[26px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.031a9.006 9.006 0 01-4.706-1.328l-5.325 1.406 1.444-5.125a8.977 8.977 0 01-1.381-4.953C2.063 6.063 7.031 1 13.063 1s11 4.969 11 11.031-4.969 11-11.032 11zm0-18.062c-4.969 0-9 4.031-9 9 0 1.937.625 3.75 1.719 5.25l-1.031 3.688 3.813-1.031A8.902 8.902 0 0012.031 19c4.969 0 9-4.031 9-9 0-4.969-4.031-9-9-9zm4.906 12.312c-.281-.156-1.625-.812-1.875-.906-.25-.094-.438-.156-.625.156-.188.312-.719.906-.875 1.094-.156.188-.313.219-.594.062-1.719-.781-3-1.812-3.844-3.375-.125-.219-.031-.344.125-.469.125-.094.281-.312.438-.5.156-.188.188-.312.281-.531.094-.219.031-.438-.031-.562-.094-.156-.625-1.531-.875-2.094-.219-.562-.438-.469-.625-.469-.156 0-.344-.031-.531-.031-.188 0-.5.062-.75.344-.25.281-.969.969-.969 2.344s.969 2.719 1.094 2.906c.125.188 1.969 3.062 4.781 4.25.688.281 1.219.469 1.625.594.688.219 1.312.188 1.813.125.562-.062 1.625-.688 1.875-1.344.219-.656.219-1.219.156-1.344-.062-.125-.219-.188-.5-.312z" /></svg>
                </div>
                WhatsApp
              </button>
              <button className="flex flex-col items-center gap-2 text-[11px] font-medium text-black group">
                <div className="w-[52px] h-[52px] rounded-full bg-black flex items-center justify-center text-white group-hover:scale-105 transition shadow-md"><Code size={24} strokeWidth={1.5} /></div>
                Salin Sematkan
              </button>
              <button className="flex flex-col items-center gap-2 text-[11px] font-medium text-black group text-center leading-tight">
                <div className="w-[52px] h-[52px] rounded-full bg-black flex items-center justify-center text-white group-hover:scale-105 transition shadow-md"><Video size={24} strokeWidth={1.5} /></div>
                Hasilkan<br />Video/Gambar
              </button>
            </div>

            <div className="flex justify-center mb-2">
              <button className="flex flex-col items-center gap-2 text-[11px] font-medium text-black group">
                <div className="w-[52px] h-[52px] rounded-full bg-[#3db199] flex items-center justify-center text-white group-hover:scale-105 transition shadow-md"><ImageIcon size={24} strokeWidth={1.5} /></div>
                Salin/Unduh Gambar
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
