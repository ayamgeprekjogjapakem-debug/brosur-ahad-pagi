'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Bot, Save, Key, Power, Search, Copy, Check, MessageSquare,
  Plus, Trash2, BookOpen, Brain, Shield, Sparkles, Folder, ToggleLeft, ToggleRight, AlertCircle, RefreshCw
} from 'lucide-react';

type TabType = 'credentials' | 'rules' | 'persona';

type AiRule = {
  id: string;
  keyword: string;
  instruction: string;
  is_active: boolean;
  created_at: string;
  target_folder_id?: string | null;
};

type FolderItem = {
  id: string;
  name: string;
};

export default function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('credentials');

  // Settings State
  const [aiEnabled, setAiEnabled] = useState(false);
  const [openrouterToken, setOpenrouterToken] = useState('');
  const [googleAiToken, setGoogleAiToken] = useState('');
  const [deepseekToken, setDeepseekToken] = useState('');
  const [chatModel, setChatModel] = useState('google/gemini-2.5-flash');
  const [materialModel, setMaterialModel] = useState('google/gemini-2.5-flash');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Initial state untuk deteksi apakah ada perubahan (dirty state)
  const [initialSettings, setInitialSettings] = useState<{
    aiEnabled: boolean;
    openrouterToken: string;
    googleAiToken: string;
    deepseekToken: string;
    chatModel: string;
    materialModel: string;
    systemPrompt: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDeepseekCopied, setIsDeepseekCopied] = useState(false);

  // Test Connection State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);

  // Knowledge Rules State (Migrated from Simulator)
  const [rules, setRules] = useState<AiRule[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isRulesLoading, setIsRulesLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newTargetFolderId, setNewTargetFolderId] = useState('');
  const [rulesFilter, setRulesFilter] = useState('');
  const [ruleSaveStatus, setRuleSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Hybrid Search & pgvector Indexing State
  const [vectorStats, setVectorStats] = useState<{
    tableExists: boolean;
    totalBrosur: number;
    totalChunks: number;
    embeddedChunks: number;
  } | null>(null);
  const [isIndexingVectors, setIsIndexingVectors] = useState(false);
  const [indexingProgressMsg, setIndexingProgressMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Check URL query for tab
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabType;
      if (tabParam && ['credentials', 'rules', 'persona'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
    fetchSettings();
    fetchRules();
    fetchFolders();
    fetchVectorStats();
  }, []);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?tab=${tab}`);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (data) {
        const loaded = {
          aiEnabled: Boolean(data.ai_enabled),
          openrouterToken: data.openrouter_token || '',
          googleAiToken: data.google_ai_token || '',
          deepseekToken: data.deepseek_token || '',
          chatModel: data.chat_model || 'google/gemini-2.5-flash',
          materialModel: data.material_model || 'google/gemini-2.5-flash',
          systemPrompt: data.system_prompt || '',
        };
        setAiEnabled(loaded.aiEnabled);
        setOpenrouterToken(loaded.openrouterToken);
        setGoogleAiToken(loaded.googleAiToken);
        setDeepseekToken(loaded.deepseekToken);
        setChatModel(loaded.chatModel);
        setMaterialModel(loaded.materialModel);
        setSystemPrompt(loaded.systemPrompt);
        setInitialSettings(loaded);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolders = async () => {
    const { data } = await supabase.from('folders').select('id, name').order('name', { ascending: false });
    if (data) setFolders(data);
  };

  const fetchRules = async () => {
    setIsRulesLoading(true);
    const { data, error } = await supabase
      .from('ai_knowledge_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setRules(data);
    }
    setIsRulesLoading(false);
  };

  const fetchVectorStats = async () => {
    try {
      const res = await fetch('/api/ai/index-vectors');
      const data = await res.json();
      if (data.success) {
        setVectorStats({
          tableExists: Boolean(data.tableExists),
          totalBrosur: data.totalBrosur || 0,
          totalChunks: data.totalChunks || 0,
          embeddedChunks: data.embeddedChunks || 0,
        });
      }
    } catch (e) {
      console.error('Error fetching vector stats:', e);
    }
  };

  const handleRunVectorIndexing = async () => {
    setIsIndexingVectors(true);
    setIndexingProgressMsg('Memulai pemecahan sub-bab & vector embedding (pgvector)...');
    let currentOffset = 0;
    let totalProcessed = 0;
    let totalCreatedChunks = 0;

    try {
      // Proses hingga 5 batch (50 brosur per klik agar cepat & responsif)
      for (let step = 0; step < 5; step++) {
        const res = await fetch('/api/ai/index-vectors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: currentOffset, batchSize: 10, withEmbedding: true }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setIndexingProgressMsg(`⚠️ ${data.error || 'Gagal menjalankan indexing vektor.'}`);
          break;
        }

        totalProcessed += data.processedBrosur || 0;
        totalCreatedChunks += data.createdChunks || 0;
        currentOffset = data.nextOffset || currentOffset + 10;

        setIndexingProgressMsg(
          `✅ Memproses ${totalProcessed} brosur -> ${totalCreatedChunks} potongan sub-bab & dalil terindeks...`
        );

        await fetchVectorStats();
        if (!data.hasMore) break;
      }
    } catch (err: any) {
      setIndexingProgressMsg(`Error: ${err.message}`);
    } finally {
      setIsIndexingVectors(false);
    }
  };

  // Deteksi apakah ada perubahan pada Tab 1 (Kredensial & Model)
  const isCredentialsChanged = useMemo(() => {
    if (!initialSettings) return false;
    return (
      aiEnabled !== initialSettings.aiEnabled ||
      openrouterToken !== initialSettings.openrouterToken ||
      googleAiToken !== initialSettings.googleAiToken ||
      deepseekToken !== initialSettings.deepseekToken ||
      chatModel !== initialSettings.chatModel ||
      materialModel !== initialSettings.materialModel
    );
  }, [initialSettings, aiEnabled, openrouterToken, googleAiToken, deepseekToken, chatModel, materialModel]);

  // Deteksi apakah ada perubahan pada Tab 3 (Persona & Prompt)
  const isPersonaChanged = useMemo(() => {
    if (!initialSettings) return false;
    return systemPrompt !== initialSettings.systemPrompt;
  }, [initialSettings, systemPrompt]);

  // Simpan Pengaturan Kredensial & Prompt
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatePayload: any = {
      ai_enabled: aiEnabled,
      openrouter_token: openrouterToken,
      google_ai_token: googleAiToken,
      deepseek_token: deepseekToken,
      chat_model: chatModel,
      material_model: materialModel,
      system_prompt: systemPrompt,
    };

    const { error } = await supabase
      .from('app_settings')
      .update(updatePayload)
      .eq('id', 1);

    if (error) {
      // Jika error karena kolom deepseek_token belum dibuat di Supabase
      if (error.message && (error.message.includes('deepseek_token') || error.message.includes('schema cache'))) {
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.deepseek_token;
        const { error: fbErr } = await supabase.from('app_settings').update(fallbackPayload).eq('id', 1);
        if (!fbErr) {
          alert('Perhatian: Kolom "deepseek_token" belum ada di tabel Supabase app_settings.\n\nSilakan jalankan SQL migration ini di Supabase SQL Editor:\nALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS deepseek_token TEXT;\n\nPengaturan lainnya telah berhasil disimpan!');
          setInitialSettings({
            aiEnabled,
            openrouterToken,
            googleAiToken,
            deepseekToken: initialSettings?.deepseekToken || '',
            chatModel,
            materialModel,
            systemPrompt,
          });
        } else {
          alert(`Gagal menyimpan: ${fbErr.message}`);
        }
      } else {
        alert(`Gagal menyimpan pengaturan: ${error.message}`);
      }
    } else {
      setInitialSettings({
        aiEnabled,
        openrouterToken,
        googleAiToken,
        deepseekToken,
        chatModel,
        materialModel,
        systemPrompt,
      });
      alert('Pengaturan AI & Kredensial berhasil disimpan!');
    }
    setIsSaving(false);
  };

  // Test Koneksi Model AI
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const isDeepSeek = chatModel === 'deepseek-chat' || chatModel === 'deepseek-reasoner';
      const isNative = chatModel.endsWith('-native');

      let tokenToUse = openrouterToken;
      let provider = 'openrouter';

      if (isDeepSeek) {
        tokenToUse = deepseekToken;
        provider = 'deepseek';
      } else if (isNative) {
        tokenToUse = googleAiToken;
        provider = 'google';
      }

      const res = await fetch('/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse, model: chatModel, provider })
      });

      const data = await res.json();
      setTestResult({ success: data.success, message: data.message });
    } catch (err: any) {
      setTestResult({ success: false, message: `Error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  // Tambah Aturan Materi Baru
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newInstruction.trim()) return;

    setRuleSaveStatus(null);
    const { data, error } = await supabase
      .from('ai_knowledge_rules')
      .insert([{
        keyword: newKeyword.trim().toLowerCase(),
        instruction: newInstruction.trim(),
        is_active: true,
        target_folder_id: newTargetFolderId || null
      }])
      .select();

    if (error) {
      setRuleSaveStatus({ type: 'error', message: 'Gagal menyimpan aturan: ' + error.message });
      return;
    }

    if (data && data.length > 0) {
      setRules(prev => [data[0], ...prev]);
      setNewKeyword('');
      setNewInstruction('');
      setNewTargetFolderId('');
      setRuleSaveStatus({ type: 'success', message: 'Aturan memori fiqih berhasil disimpan!' });
      setTimeout(() => setRuleSaveStatus(null), 3500);
    }
  };

  // Toggle Aktif/Nonaktif Aturan
  const handleToggleRule = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('ai_knowledge_rules')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
    }
  };

  // Hapus Aturan
  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Hapus aturan pengetahuan ini secara permanen?')) return;
    const { error } = await supabase
      .from('ai_knowledge_rules')
      .delete()
      .eq('id', id);

    if (!error) {
      setRules(prev => prev.filter(r => r.id !== id));
    }
  };

  const filteredRules = rules.filter(r =>
    r.keyword.toLowerCase().includes(rulesFilter.toLowerCase()) ||
    r.instruction.toLowerCase().includes(rulesFilter.toLowerCase())
  );

  const applyDefaultSahabatPrompt = () => {
    setSystemPrompt(`## PERAN
Anda adalah **Sahabat MTA**, asisten yang menjawab pertanyaan berdasarkan dokumen/PDF MTA yang telah diunggah.

## SUMBER DATA
* Gunakan HANYA isi dokumen yang tersedia.
* Jangan menggunakan pengetahuan umum, internet, pendapat pribadi, atau sumber lain.
* Jawaban harus sesuai dengan isi dokumen.
* Jika informasi tidak ditemukan atau tidak cukup, jawab:
  **“Mohon maaf, tidak ada informasi tentang itu di database kami atau brosur belum diunggah.”**

## CARA MENCARI DATA
Untuk setiap pertanyaan:
1. Pahami maksud dan sinonim pertanyaan.
2. Cari dokumen yang paling relevan.
3. Cocokkan isi dokumen dengan pertanyaan.
4. Gunakan hanya informasi yang benar-benar didukung dokumen.
5. Jangan mengarang atau mengisi kekurangan informasi.
6. Jika beberapa brosur relevan, gunakan semuanya dan sebutkan sumbernya.

## FORMAT JAWABAN
Setiap jawaban harus dimulai:
**“Saudaraku, Guru Daerah yang dirahmati Allah.”**

Kemudian:
* Jawab langsung dan ringkas.
* Gunakan bahasa yang sopan, lembut, dan mudah dipahami.
* Jelaskan poin utama berdasarkan brosur.
* Cantumkan dalil Arab dan artinya jika tersedia dalam dokumen.
* Di bagian akhir tampilkan sumber:
  * Judul brosur
  * Nomor brosur
  * Tanggal brosur

## BATASAN
Jangan:
* membuat tafsir sendiri;
* menambahkan pendapat ulama atau sumber lain;
* mengarang dalil;
* mengarang nomor/tanggal/judul brosur;
* menyimpulkan sesuatu yang tidak didukung dokumen;
* menggunakan internet kecuali pengguna secara khusus meminta penelitian di luar database.

Jika pertanyaan tidak berhubungan dengan agama/MTA, jawab:
**“Mohon maaf, Pertanyaan anda diluar ranah kami.”**

## TUJUAN
Berikan jawaban yang:
**akurat → bersumber → ringkas → mudah dipahami → dapat ditelusuri kembali ke brosur.**`);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm font-semibold">Memuat AI Control Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-emerald-600" />
            Pusat Pengaturan & Aturan AI (AI Control Center)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Satu pintu kendali untuk API Key, Model LLM, Aturan Fatwa Materi MTA, dan Persona Asisten.
          </p>
        </div>

        {/* Quick links ke Simulator & Analitik */}
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/ai-analytics"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <span>📊 Infografis Analitika AI</span>
          </a>
          <a
            href="/dashboard/ai-simulator"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Playground &rarr;</span>
          </a>
        </div>
      </div>

      {/* Tabs Navigasi */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          type="button"
          onClick={() => switchTab('credentials')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${activeTab === 'credentials'
            ? 'border-emerald-600 text-emerald-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Key className="w-4 h-4" />
          <span>1. Kredensial & Model</span>
          {isCredentialsChanged && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Perubahan belum disimpan"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('rules')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${activeTab === 'rules'
            ? 'border-emerald-600 text-emerald-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Brain className="w-4 h-4" />
          <span>2. Aturan Materi & Knowledge ({rules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('persona')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${activeTab === 'persona'
            ? 'border-emerald-600 text-emerald-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Shield className="w-4 h-4" />
          <span>3. Persona & Prompt Guardrails</span>
          {isPersonaChanged && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Perubahan belum disimpan"></span>
          )}
        </button>
      </div>

      {/* TAB 1: KREDENSIAL & MODEL */}
      {activeTab === 'credentials' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Toggle Status AI */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Power className={`w-4 h-4 ${aiEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Saklar Utama Fitur AI (Gateway)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jika dinonaktifkan, seluruh kueri AI dari aplikasi mobile dan web akan di-stop.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={aiEnabled}
                  onChange={() => setAiEnabled(!aiEnabled)}
                />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Google AI Studio Key */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" /> API Key Google AI Studio (Disarankan: Cepat & Gratis)
              </label>
              <input
                type="password"
                value={googleAiToken}
                onChange={(e) => setGoogleAiToken(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Dapatkan token gratis di <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline">Google AI Studio</a>. Digunakan untuk model Google Gemini.
              </p>
            </div>

            {/* DeepSeek Official API Key */}
            <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-sky-950 flex items-center gap-2">
                  <Key className="w-4 h-4 text-sky-600" /> API Key DeepSeek Resmi (Official Direct)
                </label>
                <span className="text-[10px] bg-sky-100 text-sky-800 font-extrabold px-2 py-0.5 rounded-md border border-sky-200">
                  Resmi platform.deepseek.com
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={deepseekToken}
                  onChange={(e) => setDeepseekToken(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 pr-10 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!deepseekToken) return;
                    navigator.clipboard.writeText(deepseekToken);
                    setIsDeepseekCopied(true);
                    setTimeout(() => setIsDeepseekCopied(false), 2000);
                  }}
                  className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition cursor-pointer"
                  title="Salin Key"
                >
                  {isDeepseekCopied ? <Check className="w-4 h-4 text-sky-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-sky-800/80 mt-1.5">
                Dapatkan token resmi di <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-sky-700 font-bold underline hover:text-sky-900">https://platform.deepseek.com/api_keys</a>. Sangat murah, stabil, dan responsif langsung ke server DeepSeek tanpa perantara.
              </p>
            </div>

            {/* OpenRouter API Key */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-500" /> API Key OpenRouter (Universal Gateway)
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={openrouterToken}
                  onChange={(e) => setOpenrouterToken(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!openrouterToken) return;
                    navigator.clipboard.writeText(openrouterToken);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
                  title="Salin Key"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Dapatkan token di <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline">OpenRouter</a> untuk akses ke DeepSeek-V3, Qwen 2.5, atau GPT-4o-mini.
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Model AI Chat & RAG Default
              </label>
              <select
                value={chatModel}
                onChange={(e) => {
                  setChatModel(e.target.value);
                  setMaterialModel(e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              >
                <optgroup label="🐋 DeepSeek Official Direct (platform.deepseek.com)">
                  <option value="deepseek-chat">DeepSeek-V3 Official (deepseek-chat - Cepat & Akurat)</option>
                  <option value="deepseek-reasoner">DeepSeek-R1 Official (deepseek-reasoner - Penalaran Materi Mendalam)</option>
                </optgroup>
                <optgroup label="⚡ Google Gemini (Sangat Cepat & Hemat)">
                  <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash (Rekomendasi Utama)</option>
                  <option value="gemini-2.5-flash-native">Google Gemini 2.5 Flash (Direct Native API)</option>
                </optgroup>
                <optgroup label="🧠 Model Penalaran Materi Lainnya (via OpenRouter)">
                  <option value="deepseek/deepseek-chat">DeepSeek-V3 via OpenRouter</option>
                  <option value="qwen/qwen-2.5-72b-instruct">Qwen 2.5 72B (Unggul Pemahaman Arab & Hadits)</option>
                  <option value="openai/gpt-4o-mini">OpenAI GPT-4o-mini</option>
                </optgroup>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving || !isCredentialsChanged}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${isCredentialsChanged && !isSaving
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 ring-2 ring-emerald-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60'
                    }`}
                  title={isCredentialsChanged ? 'Klik untuk menyimpan perubahan' : 'Tidak ada perubahan untuk disimpan'}
                >
                  <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>

                {isCredentialsChanged ? (
                  <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Ada perubahan belum disimpan
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Pengaturan tersimpan
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={
                  isTesting ||
                  ((chatModel === 'deepseek-chat' || chatModel === 'deepseek-reasoner')
                    ? !deepseekToken
                    : chatModel.endsWith('-native')
                      ? !googleAiToken
                      : !openrouterToken)
                }
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Power className="w-4 h-4" /> {isTesting ? 'Menguji...' : 'Uji Koneksi API'}
              </button>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 border ${testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                {testResult.success ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: ATURAN FIQIH & KNOWLEDGE RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Card Banner: Batasan Arsip 1995-2026 & Metode Telaah Deskripsi */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-sm border border-emerald-800/40">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Arsip Aktif 1995 – 2026
                  </span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    Kapasitas RAG: 6 Dokumen
                  </span>
                </div>
                <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  Batasan Pengambilan Data Arsip (1995 – 2026) & Telaah Deskripsi
                </h2>
                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  Pencarian RAG kini menjangkau seluruh edisi brosur MTA dari tahun <strong>1995 hingga 2026</strong> dengan batasan yang diperluas (6 dokumen teratas). AI mengekstrak intisari secara singkat dan relevan terlebih dahulu, menelaah duduk perkaranya, lalu merangkainya menjadi <strong>deskripsi penjelasan yang utuh dan bersumber</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunVectorIndexing}
                  disabled={isIndexingVectors}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isIndexingVectors ? 'animate-spin' : ''}`} />
                  <span>{isIndexingVectors ? 'Mengindeks Vektor...' : '⚡ Index Vektor pgvector'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewKeyword('*');
                    setNewTargetFolderId('');
                    setNewInstruction('Ambil dan telaah data arsip brosur dari rentang tahun 1995 hingga 2026 secara singkat dan sesuai dengan pertanyaan pengguna. Telaah dalil dan pembahasannya secara teliti, kemudian jadikan sebagai deskripsi yang utuh, padat, dan mudah dipahami.');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>+ Preset Telaah 1995-2026</span>
                </button>
              </div>
            </div>

            {/* Statistik Hybrid Search & pgvector */}
            <div className="mt-4 pt-4 border-t border-emerald-700/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-emerald-200/90">
                  📚 Total Arsip Brosur: <strong className="text-white">{vectorStats?.totalBrosur ?? '...'}</strong>
                </span>
                <span className="text-emerald-200/90">
                  🧩 Sub-Bab Chunks (`brosur_chunks`): <strong className="text-white">{vectorStats?.totalChunks ?? 0}</strong>
                </span>
                <span className="text-sky-300">
                  🧠 Vektor `pgvector` Terindeks: <strong className="text-white">{vectorStats?.embeddedChunks ?? 0}</strong>
                </span>
              </div>

              {vectorStats && !vectorStats.tableExists && (
                <span className="text-[11px] bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-lg">
                  💡 Jalankan <code>scripts/setup_hybrid_pgvector.sql</code> di Supabase SQL Editor untuk mengaktifkan tabel <code>brosur_chunks</code>
                </span>
              )}
            </div>

            {indexingProgressMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-950/50 border border-emerald-500/30 text-xs text-emerald-200 font-medium">
                {indexingProgressMsg}
              </div>
            )}
          </div>

          {/* Form Tambah Aturan */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Tambah Aturan Fatwa Materi / Knowledge Rule Baru
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Aturan ini akan disuntikkan secara dinamis saat kueri pengguna mencocokkan kata kunci tertentu (gunakan tanda <code>*</code> untuk berlaku ke semua pertanyaan).
            </p>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Kata Kunci Pemicu (*Trigger Keyword*)
                  </label>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="misal: * (Semua), tahlilan, donor darah, qunut"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Gunakan <code>*</code> jika aturan ini ingin aktif di setiap pertanyaan.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Target Kategori Folder (Opsional)
                  </label>
                  <select
                    value={newTargetFolderId}
                    onChange={(e) => setNewTargetFolderId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  >
                    <option value="">Semua Kategori (Global 1995-2026)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Instruksi Materi Khusus untuk AI (*Fatwa Constraint*)
                </label>
                <textarea
                  value={newInstruction}
                  onChange={(e) => setNewInstruction(e.target.value)}
                  rows={3}
                  placeholder="misal: 'Ambil data brosur dari rentang 1995-2026 secara singkat dan sesuai, telaah maknanya, lalu jadikan deskripsi yang utuh...'"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan Aturan Pengetahuan
                </button>

                {ruleSaveStatus && (
                  <span className={`text-xs font-bold ${ruleSaveStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {ruleSaveStatus.message}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Daftar Aturan Memori */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Daftar Aturan Pengetahuan Aktif</h3>
                <p className="text-[11px] text-slate-500">Total {rules.length} aturan tersimpan di tabel `ai_knowledge_rules`</p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rulesFilter}
                  onChange={(e) => setRulesFilter(e.target.value)}
                  placeholder="Cari aturan..."
                  className="bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {isRulesLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                Memuat aturan...
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada aturan pengetahuan fiqih yang cocok.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRules.map((rule) => {
                  const folder = folders.find(f => f.id === rule.target_folder_id);
                  return (
                    <div key={rule.id} className="p-4 hover:bg-slate-50/70 transition flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs px-2 py-0.5 rounded-md ${rule.keyword === '*' || rule.keyword.toLowerCase() === 'global'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                            }`}>
                            {rule.keyword === '*' ? '🌐 Global (Semua Kueri)' : rule.keyword}
                          </span>
                          {folder ? (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <Folder className="w-3 h-3 text-slate-400" /> {folder.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                              Arsip 1995-2026 (Semua Brosur)
                            </span>
                          )}
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${rule.is_active ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                            {rule.is_active ? 'AKTIF' : 'NONAKTIF'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-normal">
                          {rule.instruction}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id, rule.is_active)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                          title={rule.is_active ? 'Nonaktifkan Aturan' : 'Aktifkan Aturan'}
                        >
                          {rule.is_active ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Hapus Aturan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PERSONA & PROMPT GUARDRAILS */}
      {activeTab === 'persona' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Instruksi Sistem Dasar (System Prompt "Sahabat MTA")
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mendikte nada bicara, format sapaan, kewajiban mencantumkan dalil Arab, dan larangan inferensi.
                </p>
              </div>

              <button
                type="button"
                onClick={applyDefaultSahabatPrompt}
                className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                Reset ke Template Sahabat MTA
              </button>
            </div>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={16}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Ketik instruksi persona AI..."
            />

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                {isPersonaChanged ? (
                  <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Prompt telah diubah, belum disimpan
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Prompt tersimpan
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving || !isPersonaChanged}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${isPersonaChanged && !isSaving
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 ring-2 ring-emerald-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60'
                  }`}
                title={isPersonaChanged ? 'Klik untuk menyimpan perubahan prompt' : 'Tidak ada perubahan untuk disimpan'}
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Persona Prompt'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
