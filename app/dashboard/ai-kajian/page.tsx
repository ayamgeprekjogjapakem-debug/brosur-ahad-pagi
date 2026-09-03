'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Sparkles, Search, Plus, Trash2, Key, Settings2, FileText, 
  Loader2, Save, CheckCircle2, AlertCircle, FolderArchive, Layers, Database, Eye, X, Edit3, Copy, Download, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AiKajianPage() {
  const supabase = createClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<'generator' | 'saved'>('generator');

  // API Config
  const [prompt, setPrompt] = useState('');

  // Source Type Configuration
  const [sourceType, setSourceType] = useState<'individual' | 'folder' | 'all' | 'custom'>('individual');
  const [selectedSourceFolder, setSelectedSourceFolder] = useState('');
  const [customReferenceText, setCustomReferenceText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & References
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedBrosurs, setSelectedBrosurs] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState('');
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Save State & Form (from Generator)
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveYear, setSaveYear] = useState(new Date().getFullYear().toString());
  const [saveFolder, setSaveFolder] = useState('');
  const [saveSlug, setSaveSlug] = useState('');
  const [saving, setSaving] = useState(false);

  // Manual Creation State (from Saved Tab)
  const [showCreateManualModal, setShowCreateManualModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createYear, setCreateYear] = useState(new Date().getFullYear().toString());
  const [createFolder, setCreateFolder] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createText, setCreateText] = useState('');
  const [creatingManual, setCreatingManual] = useState(false);

  // Saved Materials List
  const [savedMaterials, setSavedMaterials] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  
  // Detail & Editing Modal State
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editText, setEditText] = useState('');
  const [updating, setUpdating] = useState(false);

  // Load prompt from local storage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('openrouter_prompt') || '';
    setPrompt(savedPrompt);

    const fetchFolders = async () => {
      const { data } = await supabase
        .from('folders')
        .select('id, name')
        .order('created_at', { ascending: false });
      if (data) {
        setFolders(data);
        if (data.length > 0) {
          setSaveFolder(data[0].id);
          setSelectedSourceFolder(data[0].id);
          setCreateFolder(data[0].id);
        }
      }
    };
    fetchFolders();
  }, [supabase]);

  // Sync Tab with URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'saved') {
      setActiveTab('saved');
    } else {
      setActiveTab('generator');
    }
  }, []);

  const changeTab = (tab: 'generator' | 'saved') => {
    setActiveTab(tab);
    window.history.pushState(null, '', `?tab=${tab}`);
  };

  // Load saved materials
  const fetchSavedMaterials = async () => {
    setLoadingSaved(true);
    let query = supabase
      .from('materi_kajian')
      .select('id, judul, tahun, slug, konten, teks_bersih, created_at, folder_id, folders(name)');
    
    if (savedSearchQuery.trim()) {
      query = query.ilike('judul', `%${savedSearchQuery}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (data) {
      setSavedMaterials(data);
    }
    setLoadingSaved(false);
  };

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedMaterials();
    }
  }, [activeTab, savedSearchQuery]);

  // Debounced search for brosurs
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from('brosur')
        .select('id, judul, tahun, konten, teks_bersih')
        .ilike('judul', `%${searchQuery}%`)
        .limit(6);
      if (data) {
        setSearchResults(data);
      }
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, supabase]);



  const addReference = (brosur: any) => {
    if (!selectedBrosurs.find((b) => b.id === brosur.id)) {
      setSelectedBrosurs([...selectedBrosurs, brosur]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeReference = (id: string) => {
    setSelectedBrosurs(selectedBrosurs.filter((b) => b.id !== id));
  };

  // Clean Markdown symbols client-side helper
  const cleanMarkdown = (text: string) => {
    return text
      .replace(/[#*`~_]/g, '')
      .trim();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMessage(null);
    setGeneratedResult('');

    try {
      let referencesText = '';
      let referenceNameForTitle = 'Kajian Baru';

      if (sourceType === 'individual') {
        if (selectedBrosurs.length === 0) {
          throw new Error('Harap pilih minimal satu brosur sebagai referensi sumber.');
        }
        referencesText = selectedBrosurs
          .map((b) => `Judul: ${b.judul}\nTahun: ${b.tahun}\nTeks:\n${b.teks_bersih || b.konten || ''}`)
          .join('\n\n---\n\n');
        referenceNameForTitle = selectedBrosurs[0]?.judul || 'Tema Baru';
      } else if (sourceType === 'folder') {
        if (!selectedSourceFolder) {
          throw new Error('Harap pilih kategori sumber.');
        }
        const { data, error } = await supabase
          .from('brosur')
          .select('judul, tahun, konten, teks_bersih')
          .eq('folder_id', selectedSourceFolder)
          .limit(100);
        
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Kategori yang Anda pilih belum memiliki brosur.');
        }

        referencesText = data
          .map((b) => `Judul: ${b.judul}\nTahun: ${b.tahun}\nTeks:\n${b.teks_bersih || b.konten || ''}`)
          .join('\n\n---\n\n');
        
        const folderObj = folders.find(f => f.id === selectedSourceFolder);
        referenceNameForTitle = folderObj ? folderObj.name : 'Kategori';
      } else if (sourceType === 'all') {
        const { data, error } = await supabase
          .from('brosur')
          .select('judul, tahun, konten, teks_bersih')
          .limit(150);

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Database brosur kosong.');
        }

        referencesText = data
          .map((b) => `Judul: ${b.judul}\nTahun: ${b.tahun}\nTeks:\n${b.teks_bersih || b.konten || ''}`)
          .join('\n\n---\n\n');
        referenceNameForTitle = 'Arsip Brosur';
      } else if (sourceType === 'custom') {
        if (!customReferenceText.trim()) {
          throw new Error('Harap masukkan teks referensi kustom terlebih dahulu.');
        }
        referencesText = customReferenceText;
        referenceNameForTitle = 'Kajian Kustom';
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: referencesText,
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan materi kajian.');
      }

      const cleanText = cleanMarkdown(data.text);
      setGeneratedResult(cleanText);
      
      setSaveTitle(`Materi Kajian: ${referenceNameForTitle}`);
      const cleanTitle = referenceNameForTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSaveSlug(`kajian-ai-${saveYear}-${cleanTitle}-${Math.floor(100 + Math.random() * 900)}`);
      
      setStatusMessage({ type: 'success', message: 'Materi kajian berhasil dibuat!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', message: err.message || 'Terjadi kesalahan.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!saveTitle || !saveYear || !saveSlug || !saveFolder || !generatedResult) {
      alert('Semua data wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const paragraphs = generatedResult
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('');

      const { error } = await supabase.from('materi_kajian').insert({
        judul: saveTitle,
        tahun: parseInt(saveYear, 10),
        slug: saveSlug,
        konten: paragraphs,
        teks_bersih: generatedResult,
        folder_id: saveFolder
      });

      if (error) throw error;

      alert('Materi Kajian berhasil disimpan!');
      setShowSaveModal(false);
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateManual = async () => {
    if (!createTitle || !createYear || !createSlug || !createFolder || !createText) {
      alert('Semua data wajib diisi.');
      return;
    }

    setCreatingManual(true);
    try {
      const paragraphs = createText
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('');

      const { error } = await supabase.from('materi_kajian').insert({
        judul: createTitle,
        tahun: parseInt(createYear, 10),
        slug: createSlug,
        konten: paragraphs,
        teks_bersih: createText,
        folder_id: createFolder
      });

      if (error) throw error;

      alert('Materi Kajian berhasil ditambahkan secara manual!');
      setShowCreateManualModal(false);
      fetchSavedMaterials();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setCreatingManual(false);
    }
  };

  const handleUpdateDatabase = async () => {
    if (!editTitle || !editYear || !editText || !editFolder) {
      alert('Judul, tahun, koleksi, dan isi teks tidak boleh kosong.');
      return;
    }
    setUpdating(true);
    try {
      const paragraphs = editText
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('');

      const { error } = await supabase
        .from('materi_kajian')
        .update({
          judul: editTitle,
          tahun: parseInt(editYear, 10),
          teks_bersih: editText,
          konten: paragraphs,
          folder_id: editFolder
        })
        .eq('id', selectedMaterialDetail.id);

      if (error) throw error;

      alert('Perubahan berhasil disimpan!');
      setIsEditing(false);
      setSelectedMaterialDetail({
        ...selectedMaterialDetail,
        judul: editTitle,
        tahun: editYear,
        teks_bersih: editText,
        konten: paragraphs,
        folder_id: editFolder,
        folders: folders.find(f => f.id === editFolder)
      });
      fetchSavedMaterials();
    } catch (err: any) {
      alert(`Gagal memperbarui: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSaved = async (id: string, judul: string) => {
    if (!window.confirm(`Yakin ingin menghapus materi kajian "${judul}"?`)) return;
    const { error } = await supabase.from('materi_kajian').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      setSavedMaterials(savedMaterials.filter((m) => m.id !== id));
    }
  };

  const handleTitleChange = (val: string) => {
    setSaveTitle(val);
    const cleanTitle = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSaveSlug(`kajian-ai-${saveYear}-${cleanTitle}`);
  };

  const handleCreateTitleChange = (val: string) => {
    setCreateTitle(val);
    const cleanTitle = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setCreateSlug(`kajian-manual-${createYear}-${cleanTitle}`);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Teks berhasil disalin ke clipboard!');
  };

  const handleDownloadPdf = (title: string, text: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedHtml = formatKajianTextToHtml(text);

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />
          <style>
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #18181b;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              font-size: 20px;
              font-weight: 800;
              margin-bottom: 24px;
              text-align: center;
              border-bottom: 2px solid #e4e4e7;
              padding-bottom: 12px;
            }
            p {
              margin-bottom: 16px;
              text-align: justify;
            }
            .arabic {
              font-family: 'Scheherazade New', serif;
              font-size: 18px;
              line-height: 1.8;
              direction: rtl;
              text-align: right;
              display: block;
              margin: 16px 0;
              background-color: #fafafa;
              padding: 12px 16px;
              border-radius: 8px;
            }
            @media print {
              body { padding: 0; }
              @page { size: A4; margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div>${formattedHtml}</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCustomReferenceText(text);
    };
    reader.readAsText(file);
  };

  const containsArabic = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  const formatKajianTextToHtml = (text: string) => {
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (containsArabic(trimmed)) {
          return `<div class="arabic">${trimmed}</div>`;
        }
        return `<p>${trimmed}</p>`;
      })
      .join('');
  };

  const renderFormattedKajian = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      if (containsArabic(trimmed)) {
        return (
          <p 
            key={idx} 
            className="font-arabic text-[18px] leading-[1.8] text-right py-2 px-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl my-3 text-zinc-900 dark:text-white"
            style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}
          >
            {trimmed}
          </p>
        );
      }
      return (
        <p 
          key={idx} 
          className="text-[12px] leading-[1.5] mb-2.5 text-zinc-800 dark:text-zinc-200 text-justify"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {trimmed}
        </p>
      );
    });
  };

  const startEditMode = () => {
    setEditTitle(selectedMaterialDetail.judul);
    setEditYear(selectedMaterialDetail.tahun.toString());
    setEditFolder(selectedMaterialDetail.folder_id || '');
    setEditText(selectedMaterialDetail.teks_bersih || selectedMaterialDetail.konten);
    setIsEditing(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Inject custom fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <Sparkles className="text-accent" /> Pembuat Materi Kajian AI
            </h1>
            <p className="text-zinc-500 font-medium max-w-xl">
              Buat materi kajian keislaman terstruktur secara otomatis yang bersumber dari arsip Brosur Ahad Pagi.
            </p>
          </div>


        </header>

        {/* Tab Selector with URL sync */}
        <div className="flex items-center gap-2 mb-6 border-b border-black/5 dark:border-white/5 pb-2">
          <button 
            onClick={() => changeTab('generator')}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors ${activeTab === 'generator' ? 'bg-white dark:bg-zinc-900 border-t border-l border-r border-black/5 dark:border-white/5 text-accent' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Sparkles size={16} /> Generator AI
          </button>
          <button 
            onClick={() => changeTab('saved')}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors ${activeTab === 'saved' ? 'bg-white dark:bg-zinc-900 border-t border-l border-r border-black/5 dark:border-white/5 text-blue-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Database size={16} /> Kajian Tersimpan (Dashboard Only)
          </button>
        </div>



        {activeTab === 'generator' ? (
          /* TAB 1: GENERATOR */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <h2 className="font-extrabold text-lg mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText size={18} className="text-accent" /> 1. Sumber Referensi
                </h2>

                <div className="grid grid-cols-4 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden p-1 bg-zinc-50 dark:bg-zinc-950 mb-5 text-[10px] font-bold gap-1">
                  <button
                    onClick={() => setSourceType('individual')}
                    className={`py-2 rounded-lg text-center transition-colors truncate ${sourceType === 'individual' ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm' : 'text-zinc-500'}`}
                  >
                    Pilih Brosur
                  </button>
                  <button
                    onClick={() => setSourceType('folder')}
                    className={`py-2 rounded-lg text-center transition-colors truncate ${sourceType === 'folder' ? 'bg-white dark:bg-zinc-800 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Koleksi
                  </button>
                  <button
                    onClick={() => setSourceType('all')}
                    className={`py-2 rounded-lg text-center transition-colors truncate ${sourceType === 'all' ? 'bg-white dark:bg-zinc-800 text-purple-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setSourceType('custom')}
                    className={`py-2 rounded-lg text-center transition-colors truncate ${sourceType === 'custom' ? 'bg-white dark:bg-zinc-800 text-amber-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Teks Kustom
                  </button>
                </div>

                {sourceType === 'individual' && (
                  <>
                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        placeholder="Cari brosur referensi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-accent text-sm"
                      />
                      {searching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Loader2 className="animate-spin text-zinc-400" size={16} />
                        </div>
                      )}

                      {searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto p-1 divide-y divide-black/5 dark:divide-white/5">
                          {searchResults.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => addReference(b)}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between rounded-lg transition-colors"
                            >
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{b.judul}</span>
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-[10px] px-2 py-0.5 rounded-full font-bold text-zinc-500 shrink-0">
                                {b.tahun}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedBrosurs.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm">
                          Pilih brosur dari kolom pencarian di atas.
                        </div>
                      ) : (
                        selectedBrosurs.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-black/5 dark:border-white/5 group"
                          >
                            <div className="overflow-hidden pr-2">
                              <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate">{b.judul}</p>
                              <p className="text-[10px] text-zinc-500">Tahun {b.tahun}</p>
                            </div>
                            <button
                              onClick={() => removeReference(b.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {sourceType === 'folder' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pilih Koleksi / Kategori</label>
                      <div className="relative">
                        <select
                          value={selectedSourceFolder}
                          onChange={(e) => setSelectedSourceFolder(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-accent text-sm cursor-pointer appearance-none"
                        >
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <FolderArchive className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      </div>
                    </div>
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-xs text-blue-600 dark:text-blue-400">
                      AI akan menggunakan materi-materi dari seluruh brosur yang berada dalam kategori koleksi ini sebagai rujukan.
                    </div>
                  </div>
                )}

                {sourceType === 'all' && (
                  <div className="space-y-4">
                    <div className="p-5 bg-purple-500/5 border border-purple-500/10 rounded-2xl text-center space-y-2">
                      <Database className="text-purple-500 mx-auto" size={32} />
                      <p className="font-bold text-xs text-purple-700 dark:text-purple-400">Gunakan Seluruh Database</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        AI akan menyaring ide dan konten dari seluruh arsip brosur untuk dijadikan bahan utama pembuatan materi kajian.
                      </p>
                    </div>
                  </div>
                )}

                {sourceType === 'custom' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-500 uppercase">Masukkan Teks Rujukan</label>
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                        title="Unggah file teks (.txt)"
                      >
                        <UploadCloud size={14} /> Unggah File (.txt)
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".txt,.md" 
                        className="hidden" 
                      />
                    </div>
                    <textarea
                      value={customReferenceText}
                      onChange={(e) => setCustomReferenceText(e.target.value)}
                      placeholder="Ketik atau tempel teks rujukan materi di sini..."
                      rows={8}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm resize-y custom-scrollbar"
                    />
                  </div>
                )}
              </div>

              {/* Custom prompt instructions */}
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <h2 className="font-extrabold text-lg mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Settings2 size={18} className="text-blue-500" /> 2. Instruksi Kajian
                </h2>
                <textarea
                  placeholder="Contoh: Fokuskan pembahasan pada aspek sabar dan syukur, tambahkan 3 pertanyaan pemantik diskusi di akhir..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm resize-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || (sourceType === 'individual' && selectedBrosurs.length === 0) || (sourceType === 'custom' && !customReferenceText.trim())}
                  className="w-full mt-4 bg-accent text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Sedang Merumuskan...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Mulai Rumuskan Materi
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm min-h-[500px] flex flex-col justify-between">
                <div>
                  <header className="border-b border-black/5 dark:border-white/5 pb-4 mb-6 flex items-center justify-between">
                    <h2 className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      Hasil Kajian AI
                    </h2>
                    {generatedResult && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyText(generatedResult)}
                          className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 transition-colors"
                          title="Salin Materi"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(saveTitle || 'Materi Kajian AI', generatedResult)}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 rounded-xl transition-colors"
                          title="Cetak / Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => setShowSaveModal(true)}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                        >
                          <Save size={14} /> Simpan ke Data
                        </button>
                      </div>
                    )}
                  </header>

                  {statusMessage && (
                    <div
                      className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${
                        statusMessage.type === 'success'
                          ? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {statusMessage.type === 'success' ? (
                        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      )}
                      <span>{statusMessage.message}</span>
                    </div>
                  )}

                  {generating ? (
                    <div className="py-24 flex flex-col items-center justify-center text-zinc-500">
                      <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                      <p className="font-bold text-sm tracking-wide animate-pulse">Menghubungkan ke OpenRouter...</p>
                      <p className="text-xs text-zinc-400 mt-1">Ini mungkin memerlukan waktu 10-30 detik.</p>
                    </div>
                  ) : generatedResult ? (
                    <div className="bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-inner max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {renderFormattedKajian(generatedResult)}
                    </div>
                  ) : (
                    <div className="py-32 text-center text-zinc-400 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                      <Sparkles size={40} className="text-zinc-300 dark:text-zinc-700 mb-4" />
                      <p className="font-medium text-sm">Belum ada materi kajian yang dibuat.</p>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                        Pilih rujukan di panel kiri (Brosur, Koleksi, Semua, atau Teks Kustom), isi instruksi tambahan bila perlu, lalu klik tombol **Mulai Rumuskan**.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: SAVED MATERIALS LIST */
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari materi kajian tersimpan..."
                  value={savedSearchQuery}
                  onChange={(e) => setSavedSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-accent text-sm"
                />
              </div>

              {/* Add Manual Kajian Button */}
              <button
                onClick={() => {
                  setCreateTitle('');
                  setCreateYear(new Date().getFullYear().toString());
                  setCreateSlug('');
                  setCreateText('');
                  if (folders.length > 0) setCreateFolder(folders[0].id);
                  setShowCreateManualModal(true);
                }}
                className="w-full sm:w-auto bg-accent text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors shrink-0 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Tambah Kajian Manual
              </button>
            </div>

            {loadingSaved ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                <Loader2 className="animate-spin text-accent mb-4" size={28} />
                <p className="text-sm font-semibold tracking-wide animate-pulse">Memuat materi kajian...</p>
              </div>
            ) : savedMaterials.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 border-2 border-dashed border-zinc-150 dark:border-zinc-800 rounded-3xl">
                Tidak ada materi kajian tersimpan yang ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 text-zinc-500 text-sm">
                      <th className="p-4 font-bold">Judul Kajian</th>
                      <th className="p-4 font-bold">Tahun Rujukan</th>
                      <th className="p-4 font-bold">Koleksi</th>
                      <th className="p-4 font-bold">Tanggal Dibuat</th>
                      <th className="p-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedMaterials.map((item) => (
                      <tr key={item.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-bold max-w-[250px] truncate" title={item.judul}>
                          {item.judul}
                        </td>
                        <td className="p-4">
                          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                            {item.tahun}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-zinc-500">
                          {item.folders ? (
                            <span className="flex items-center gap-1"><FolderArchive size={14} className="text-blue-500"/> {item.folders.name}</span>
                          ) : (
                            <span className="italic text-zinc-400">Tidak ada koleksi</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-zinc-400">
                          {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedMaterialDetail(item);
                              setIsEditing(false);
                            }}
                            className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                            title="Baca Kajian"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSaved(item.id, item.judul)}
                            className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Detail / Editing Modal */}
      <AnimatePresence>
        {selectedMaterialDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full h-[85vh] shadow-2xl flex flex-col justify-between"
            >
              {isEditing ? (
                /* EDIT MODE */
                <div className="flex-1 flex flex-col justify-between h-full">
                  <div className="border-b border-black/5 dark:border-white/5 pb-4 mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Edit3 size={18} className="text-accent" /> Sunting Kajian AI
                    </h3>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 custom-scrollbar">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Kajian</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tahun Rujukan</label>
                        <input
                          type="number"
                          value={editYear}
                          onChange={(e) => setEditYear(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Master Koleksi</label>
                        <select
                          value={editFolder}
                          onChange={(e) => setEditFolder(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                        >
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Isi Kajian (Tanpa Markdown # dan *)</label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={12}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent font-sans text-sm resize-y custom-scrollbar"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 bg-zinc-150 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-bold text-sm transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleUpdateDatabase}
                      disabled={updating}
                      className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {updating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                /* READ MODE */
                <div className="flex-1 flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between border-b border-black/5 dark:border-white/5 pb-4 mb-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{selectedMaterialDetail.judul}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                        <span>Tahun Rujukan: {selectedMaterialDetail.tahun}</span>
                        <span>•</span>
                        <span>Koleksi: {selectedMaterialDetail.folders?.name || 'Tanpa Koleksi'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={startEditMode}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
                        title="Sunting Kajian"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleCopyText(selectedMaterialDetail.teks_bersih || selectedMaterialDetail.konten)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
                        title="Salin Teks"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(selectedMaterialDetail.judul, selectedMaterialDetail.teks_bersih || selectedMaterialDetail.konten)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-blue-500"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => setSelectedMaterialDetail(null)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 mb-4 scrollbar-thin">
                    <div className="bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-inner">
                      {renderFormattedKajian(selectedMaterialDetail.teks_bersih || selectedMaterialDetail.konten)}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5">
                    <button
                      onClick={() => setSelectedMaterialDetail(null)}
                      className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-bold text-sm transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Modal popup (from Generator) */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div>
                <h3 className="text-xl font-extrabold mb-1">Simpan Materi Kajian</h3>
                <p className="text-xs text-zinc-500">Materi akan disimpan secara privat di database internal Dashboard.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Kajian</label>
                  <input
                    type="text"
                    required
                    value={saveTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tahun Rujukan</label>
                    <input
                      type="number"
                      required
                      value={saveYear}
                      onChange={(e) => setSaveYear(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Master Koleksi</label>
                    <select
                      value={saveFolder}
                      onChange={(e) => setSaveFolder(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Slug / URL (Otomatis)</label>
                  <input
                    type="text"
                    required
                    value={saveSlug}
                    onChange={(e) => setSaveSlug(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveToDatabase}
                  disabled={saving}
                  className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Simpan Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Manual Kajian Modal */}
      <AnimatePresence>
        {showCreateManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full h-[85vh] shadow-2xl flex flex-col justify-between"
            >
              <div className="border-b border-black/5 dark:border-white/5 pb-4 mb-4 flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Plus size={20} className="text-accent" /> Tambah Kajian Secara Manual
                </h3>
                <button 
                  onClick={() => setShowCreateManualModal(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 custom-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Judul Kajian</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan judul materi kajian..."
                    value={createTitle}
                    onChange={(e) => handleCreateTitleChange(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tahun Rujukan</label>
                    <input
                      type="number"
                      required
                      value={createYear}
                      onChange={(e) => setCreateYear(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Master Koleksi</label>
                    <select
                      value={createFolder}
                      onChange={(e) => setCreateFolder(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent text-sm"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Slug / URL (Otomatis)</label>
                  <input
                    type="text"
                    required
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Isi Materi Kajian (Ketik manual/tempel di sini)</label>
                  <textarea
                    required
                    placeholder="Tulis materi kajian Anda di sini. Gunakan pemisahan double enter untuk paragraf baru..."
                    value={createText}
                    onChange={(e) => setCreateText(e.target.value)}
                    rows={10}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent font-sans text-sm resize-y custom-scrollbar"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => setShowCreateManualModal(false)}
                  className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateManual}
                  disabled={creatingManual}
                  className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingManual ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Simpan Kajian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
