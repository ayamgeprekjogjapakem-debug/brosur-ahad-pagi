'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText, Folder, Search, Copy, Check, Download,
  Code, Eye, ChevronRight, ChevronDown, BookOpen, Clock, HardDrive,
  RefreshCw, PanelLeftClose, PanelLeft, Type,
  Minus, Plus, AlignLeft, Maximize2, Minimize2, ChevronsUpDown,
  Smartphone, Globe, Sparkles
} from 'lucide-react';

interface DocItem {
  id: string;
  name: string;
  title: string;
  category: string;
  scope: 'web' | 'flutter';
  relativePath: string;
  size: number;
  updatedAt: string;
}

interface DocCategory {
  category: string;
  label: string;
  scope: 'web' | 'flutter';
  items: DocItem[];
}

type FontFamilyType = 'inter' | 'serif' | 'mono' | 'amiri';
type FontSizeType = 14 | 16 | 18 | 20 | 22;
type ContentWidthType = 'normal' | 'wide' | 'full';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function MdReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [docCounts, setDocCounts] = useState<{ total: number; web: number; flutter: number }>({
    total: 0,
    web: 0,
    flutter: 0,
  });
  const [activeScope, setActiveScope] = useState<'all' | 'web' | 'flutter'>('all');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docMeta, setDocMeta] = useState<any>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);

  // PREFERENSI TAMPILAN BACA (PERSIST DI LOCALSTORAGE)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [fontFamily, setFontFamily] = useState<FontFamilyType>('inter');
  const [fontSize, setFontSize] = useState<FontSizeType>(16);
  const [contentWidth, setContentWidth] = useState<ContentWidthType>('normal');
  const [showTypographyMenu, setShowTypographyMenu] = useState(false);

  // Load preferensi dari LocalStorage saat pertama kali mount
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('md_reader_sidebar_collapsed');
      if (savedCollapsed !== null) {
        setIsSidebarCollapsed(savedCollapsed === 'true');
      }
      const savedCollapsedCats = localStorage.getItem('md_reader_collapsed_categories');
      if (savedCollapsedCats) {
        setCollapsedCategories(JSON.parse(savedCollapsedCats));
      }
      const savedFont = localStorage.getItem('md_reader_font_family') as FontFamilyType;
      if (savedFont && ['inter', 'serif', 'mono', 'amiri'].includes(savedFont)) {
        setFontFamily(savedFont);
      }
      const savedSize = Number(localStorage.getItem('md_reader_font_size')) as FontSizeType;
      if (savedSize && [14, 16, 18, 20, 22].includes(savedSize)) {
        setFontSize(savedSize);
      }
      const savedWidth = localStorage.getItem('md_reader_content_width') as ContentWidthType;
      if (savedWidth && ['normal', 'wide', 'full'].includes(savedWidth)) {
        setContentWidth(savedWidth);
      }
    } catch {
      // Abaikan jika SSR / error localStorage
    }
  }, []);

  // Simpan preferensi collapse sidebar
  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('md_reader_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Toggle collapse per-kategori folder
  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories(prev => {
      const updated = {
        ...prev,
        [category]: !prev[category]
      };
      try {
        localStorage.setItem('md_reader_collapsed_categories', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Cek apakah semua kategori sedang ter-collapse
  const areAllCategoriesCollapsed = useMemo(() => {
    if (categories.length === 0) return false;
    return categories.every(c => collapsedCategories[c.category]);
  }, [categories, collapsedCategories]);

  // Toggle collapse / expand semua kategori sekaligus
  const toggleAllCategoriesCollapse = () => {
    setCollapsedCategories(prev => {
      const nextState = !areAllCategoriesCollapsed;
      const updated: Record<string, boolean> = {};
      categories.forEach(c => {
        updated[c.category] = nextState;
      });
      try {
        localStorage.setItem('md_reader_collapsed_categories', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Simpan preferensi font family
  const handleFontChange = (font: FontFamilyType) => {
    setFontFamily(font);
    localStorage.setItem('md_reader_font_family', font);
  };

  // Simpan preferensi font size
  const handleSizeChange = (delta: number) => {
    const sizeSteps: FontSizeType[] = [14, 16, 18, 20, 22];
    const currentIndex = sizeSteps.indexOf(fontSize);
    let nextIndex = currentIndex + delta;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= sizeSteps.length) nextIndex = sizeSteps.length - 1;
    const nextSize = sizeSteps[nextIndex];
    setFontSize(nextSize);
    localStorage.setItem('md_reader_font_size', String(nextSize));
  };

  // Simpan preferensi content width
  const handleWidthChange = (w: ContentWidthType) => {
    setContentWidth(w);
    localStorage.setItem('md_reader_content_width', w);
  };

  // 1. Ambil daftar file markdown saat mount
  useEffect(() => {
    async function loadDocs() {
      setIsLoadingList(true);
      try {
        const res = await fetch('/api/md-docs');
        const data = await res.json();
        if (res.ok && data.categories) {
          setCategories(data.categories);
          setDocCounts({
            total: data.total || 0,
            web: data.totalWeb || 0,
            flutter: data.totalFlutter || 0,
          });
          const paramFile = searchParams.get('file');
          const target = paramFile || data.defaultFile;
          if (target) {
            setSelectedFile(target);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil daftar dokumen:', err);
      } finally {
        setIsLoadingList(false);
      }
    }
    loadDocs();
  }, []);

  // 2. Ambil konten dokumen ketika selectedFile berubah
  useEffect(() => {
    if (!selectedFile) return;

    async function loadFileContent() {
      setIsLoadingDoc(true);
      try {
        const res = await fetch(`/api/md-docs?file=${encodeURIComponent(selectedFile!)}`);
        const data = await res.json();
        if (res.ok) {
          setDocContent(data.content || '');
          setDocMeta(data);
        } else {
          setDocContent(`# Gagal Memuat Dokumen\n\n${data.error || 'Berkas tidak ditemukan.'}`);
          setDocMeta(null);
        }
      } catch (err: any) {
        setDocContent(`# Terjadi Kendala\n\n${err.message}`);
        setDocMeta(null);
      } finally {
        setIsLoadingDoc(false);
      }
    }

    loadFileContent();
  }, [selectedFile]);

  // Handler memilih file
  const handleSelectFile = (relPath: string) => {
    setSelectedFile(relPath);
    router.replace(`/dashboard/md-reader?file=${encodeURIComponent(relPath)}`, { scroll: false });
  };

  // Filter dokumen berdasarkan scope dan query pencarian
  const filteredCategories = useMemo(() => {
    // Filter scope terlebih dahulu
    let baseCats = categories;
    if (activeScope !== 'all') {
      baseCats = categories.filter(cat => cat.scope === activeScope);
    }

    if (!searchQuery.trim()) return baseCats;
    const q = searchQuery.toLowerCase();

    return baseCats
      .map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.title.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.relativePath.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.items.length > 0);
  }, [categories, activeScope, searchQuery]);

  // Handler salin konten
  const handleCopy = () => {
    if (!docContent) return;
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handler unduh file .md
  const handleDownload = () => {
    if (!docContent) return;
    const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = docMeta?.name || 'document.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Pemetaan class Font Family
  const fontFamilyClass = useMemo(() => {
    switch (fontFamily) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'amiri':
        return 'font-amiri';
      case 'inter':
      default:
        return 'font-sans'; // Default Inter
    }
  }, [fontFamily]);

  // Pemetaan class Prose Font Size
  const fontSizeClass = useMemo(() => {
    switch (fontSize) {
      case 14:
        return 'prose-sm text-sm';
      case 18:
        return 'prose-lg text-lg';
      case 20:
        return 'prose-xl text-xl';
      case 22:
        return 'prose-2xl text-2xl';
      case 16:
      default:
        return 'prose-base text-base';
    }
  }, [fontSize]);

  // Pemetaan class Max Width Canvas
  const contentWidthClass = useMemo(() => {
    switch (contentWidth) {
      case 'wide':
        return 'max-w-6xl';
      case 'full':
        return 'max-w-none';
      case 'normal':
      default:
        return 'max-w-4xl';
    }
  }, [contentWidth]);

  return (
    <div className="flex h-[calc(100vh-68px)] bg-slate-50 overflow-hidden relative">

      {/* SIDEBAR DAFTAR FILE MARKDOWN DENGAN COLLAPSE TRANSITION */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col shrink-0 h-full z-10 transition-all duration-300 ease-in-out ${isSidebarCollapsed
            ? 'w-0 -translate-x-full border-r-0 opacity-0 pointer-events-none'
            : 'w-80 sm:w-88 translate-x-0 opacity-100'
          }`}
      >
        {/* Header Sidebar */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-slate-800 leading-tight">MD Reader</h2>
                <p className="text-[11px] font-semibold text-slate-400">Web & Integrasi Flutter</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleAllCategoriesCollapse}
                className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-800 rounded-md transition cursor-pointer flex items-center gap-1"
                title={areAllCategoriesCollapsed ? "Buka Semua Folder" : "Ciutkan Semua Folder"}
              >
                <span>{categories.reduce((acc, c) => acc + c.items.length, 0)} Berkas</span>
                <ChevronsUpDown className="w-3 h-3 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Sembunyikan Sidebar"
                aria-label="Sembunyikan Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scope Selector Tabs (Semua / Web / Flutter) */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveScope('all')}
              className={`py-1.5 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${activeScope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <span>Semua</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-200/70 text-slate-700">
                {docCounts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScope('web')}
              className={`py-1.5 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${activeScope === 'web'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <Globe className="w-3 h-3 text-emerald-600" />
              <span>Web</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-200/70 text-slate-700">
                {docCounts.web}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScope('flutter')}
              className={`py-1.5 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${activeScope === 'flutter'
                  ? 'bg-white text-sky-800 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <Smartphone className="w-3 h-3 text-sky-600" />
              <span>Flutter</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-sky-100 text-sky-800 font-bold">
                {docCounts.flutter}
              </span>
            </button>
          </div>

          {/* Search Bar Dokumen */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeScope === 'flutter'
                  ? "Cari dokumentasi Flutter..."
                  : activeScope === 'web'
                    ? "Cari dokumentasi Web & AI..."
                    : "Cari berkas markdown..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* List Kategori & Dokumen */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {isLoadingList ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
              Memindai berkas markdown...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada dokumen yang cocok.
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isCategoryCollapsed = !searchQuery.trim() && Boolean(collapsedCategories[cat.category]);

              return (
                <div key={cat.category} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(cat.category)}
                    className="w-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 rounded-lg flex items-center justify-between transition cursor-pointer select-none group text-left"
                    title={isCategoryCollapsed ? `Buka folder ${cat.label}` : `Ciutkan folder ${cat.label}`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${isCategoryCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                      />
                      <Folder className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="text-[10px] font-semibold bg-slate-100 group-hover:bg-slate-200/60 text-slate-500 px-1.5 py-0.2 rounded shrink-0">
                      {cat.items.length}
                    </span>
                  </button>

                  {/* List Item Dokumen yang bisa collapse keatas */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isCategoryCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[3000px] opacity-100'
                      }`}
                  >
                    <div className="space-y-0.5 pt-0.5">
                      {cat.items.map((item) => {
                        const isSelected = selectedFile === item.relativePath;
                        const isMaster = item.name.includes('MASTER') || item.name.includes('README');
                        const isFlutter = item.scope === 'flutter';

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectFile(item.relativePath)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-start gap-2.5 group cursor-pointer ${isSelected
                                ? isFlutter
                                  ? 'bg-sky-50 text-sky-950 font-bold border border-sky-200/90 shadow-xs'
                                  : 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-xs'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                          >
                            {isFlutter ? (
                              <Smartphone
                                className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-sky-600' : 'text-sky-400 group-hover:text-sky-600'
                                  }`}
                              />
                            ) : (
                              <FileText
                                className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                                  }`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate leading-snug">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-normal">
                                {activeScope === 'all' && (
                                  <span
                                    className={`px-1 py-0.2 rounded font-semibold text-[9px] ${isFlutter
                                        ? 'bg-sky-100/80 text-sky-700'
                                        : 'bg-emerald-100/70 text-emerald-700'
                                      }`}
                                  >
                                    {isFlutter ? 'Flutter' : 'Web'}
                                  </span>
                                )}
                                <span className="truncate">{item.name}</span>
                                <span>•</span>
                                <span>{formatBytes(item.size)}</span>
                              </div>
                            </div>
                            {isMaster && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800">
                                Master
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* MAIN READING CANVAS */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white min-w-0">
        {/* Header Atas Dokumen */}
        <div className="px-4 sm:px-8 py-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Tombol Toggle Sidebar saat collapsed / expanded */}
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition border shadow-xs cursor-pointer shrink-0 text-xs font-semibold ${isSidebarCollapsed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              title={isSidebarCollapsed ? 'Tampilkan Daftar Berkas' : 'Sembunyikan Sidebar'}
              aria-label="Toggle Sidebar"
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeft className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Berkas</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">Tutup Sidebar</span>
                </>
              )}
            </button>

            <div className="min-w-0">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                {docMeta?.scope === 'flutter' ? (
                  <span className="flex items-center gap-1 text-sky-700 font-bold bg-sky-50 px-1.5 py-0.2 rounded">
                    <Smartphone className="w-3 h-3" />
                    <span>pustaka (Flutter)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                    <Globe className="w-3 h-3" />
                    <span>brosur-ahad-pagi (Web)</span>
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="hover:text-slate-600 font-mono text-[11px]">md</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-slate-600 font-semibold truncate max-w-xs sm:max-w-sm">
                  {docMeta?.name || 'Dokumen'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate max-w-md sm:max-w-xl">
                  {docMeta?.title || 'Memuat Dokumen...'}
                </h1>
                {docMeta?.scope === 'flutter' ? (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
                    <Smartphone className="w-3 h-3" /> Integrasi Flutter
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    <Globe className="w-3 h-3" /> Web Proyek
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">

            {/* CONTROLLER TYPOGRAPHY (FONT & SIZE) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTypographyMenu(!showTypographyMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${showTypographyMenu
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                  }`}
                title="Pengaturan Font & Ukuran Teks"
              >
                <Type className="w-3.5 h-3.5 text-emerald-600" />
                <span className="capitalize">{fontFamily}</span>
                <span className="text-slate-400 text-[11px]">({fontSize}px)</span>
              </button>

              {/* Popover Pengaturan Teks */}
              {showTypographyMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowTypographyMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Pilih Font (Inter Default)
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFontChange('inter')}
                          className={`px-3 py-2 text-xs font-sans rounded-xl border text-left transition cursor-pointer ${fontFamily === 'inter'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                          <span className="block font-semibold">Inter</span>
                          <span className="text-[10px] text-slate-400 font-normal">Modern (Default)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFontChange('serif')}
                          className={`px-3 py-2 text-xs font-serif rounded-xl border text-left transition cursor-pointer ${fontFamily === 'serif'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                          <span className="block font-semibold">Serif</span>
                          <span className="text-[10px] text-slate-400 font-normal">Nyaman Dibaca</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFontChange('mono')}
                          className={`px-3 py-2 text-xs font-mono rounded-xl border text-left transition cursor-pointer ${fontFamily === 'mono'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                          <span className="block font-semibold">Monospace</span>
                          <span className="text-[10px] text-slate-400 font-normal">Gaya Kode</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFontChange('amiri')}
                          className={`px-3 py-2 text-xs font-amiri rounded-xl border text-left transition cursor-pointer ${fontFamily === 'amiri'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                          <span className="block font-semibold">Amiri</span>
                          <span className="text-[10px] text-slate-400 font-normal">Sastra & Materi</span>
                        </button>
                      </div>
                    </div>

                    {/* Ukuran Teks (Font Size) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Ukuran Teks
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          {fontSize}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleSizeChange(-1)}
                          disabled={fontSize <= 14}
                          className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Perkecil Teks"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 flex justify-between px-2 text-[10px] text-slate-400 font-medium">
                          <span className={fontSize === 14 ? 'font-bold text-emerald-700' : ''}>14</span>
                          <span className={fontSize === 16 ? 'font-bold text-emerald-700' : ''}>16</span>
                          <span className={fontSize === 18 ? 'font-bold text-emerald-700' : ''}>18</span>
                          <span className={fontSize === 20 ? 'font-bold text-emerald-700' : ''}>20</span>
                          <span className={fontSize === 22 ? 'font-bold text-emerald-700' : ''}>22</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSizeChange(1)}
                          disabled={fontSize >= 22}
                          className="p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Perbesar Teks"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Lebar Konten */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Lebar Area Baca
                      </span>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => handleWidthChange('normal')}
                          className={`py-1 rounded-lg text-center transition cursor-pointer ${contentWidth === 'normal' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500'
                            }`}
                        >
                          Standar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWidthChange('wide')}
                          className={`py-1 rounded-lg text-center transition cursor-pointer ${contentWidth === 'wide' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500'
                            }`}
                        >
                          Lebar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWidthChange('full')}
                          className={`py-1 rounded-lg text-center transition cursor-pointer ${contentWidth === 'full' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500'
                            }`}
                        >
                          Penuh
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('rendered')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${viewMode === 'rendered'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dokumen</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${viewMode === 'raw'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Raw</span>
              </button>
            </div>

            {/* Tombol Salin */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition shadow-xs cursor-pointer"
              title="Salin isi berkas"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 hidden sm:inline">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Salin</span>
                </>
              )}
            </button>

            {/* Tombol Unduh */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition shadow-xs cursor-pointer"
              title="Unduh berkas .md"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        {docMeta && (
          <div className="px-4 sm:px-8 py-2 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 shrink-0">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Diperbarui: {formatDate(docMeta.updatedAt)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              Ukuran: {formatBytes(docMeta.size)}
            </span>
            <span>•</span>
            <span className="font-mono text-slate-500 truncate max-w-sm flex items-center gap-1">
              {docMeta.scope === 'flutter' ? (
                <>
                  <Smartphone className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>FLUTTER/pustaka/md/{docMeta.relativePath.replace(/^flutter\//, '')}</span>
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>brosur-ahad-pagi/md/{docMeta.relativePath.replace(/^web\//, '')}</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Konten Dokumen dengan Font Family & Size Kustom */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 lg:px-14">
          {isLoadingDoc ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              Membaca isi berkas markdown...
            </div>
          ) : viewMode === 'raw' ? (
            <pre className="font-mono text-xs text-slate-800 bg-slate-50 p-6 rounded-2xl border border-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed selection:bg-emerald-100">
              {docContent}
            </pre>
          ) : (
            <div
              className={`mx-auto ${contentWidthClass} ${fontFamilyClass} ${fontSizeClass} prose prose-slate prose-headings:font-black prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-a:font-semibold hover:prose-a:underline prose-code:font-mono prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-slate-800 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-2xl prose-table:border prose-table:border-slate-200 prose-th:bg-slate-50 prose-th:p-3 prose-td:p-3 prose-td:border-t prose-td:border-slate-100`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {docContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </main>

      {/* Floating Button Buka Daftar Berkas saat Sidebar Tertutup */}
      {isSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className="fixed bottom-6 left-6 z-40 bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-xl hover:shadow-2xl rounded-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 flex items-center gap-2 transition cursor-pointer group animate-in fade-in slide-in-from-left-4 duration-200"
          title="Buka Daftar Berkas Markdown /md"
        >
          <Folder className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span>Daftar Berkas /md</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

    </div>
  );
}

export default function MdReaderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
          Memuat MD Reader...
        </div>
      }
    >
      <MdReaderContent />
    </Suspense>
  );
}
