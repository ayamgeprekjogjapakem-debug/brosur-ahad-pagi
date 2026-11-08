'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot, Plus, Trash2,
  RefreshCw, Send, ArrowLeft, Menu, ShieldCheck, HardDrive,
  Copy, Check, Share2, Pencil, RotateCcw, BookOpen, Sparkles, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainSidebar from '@/app/components/MainSidebar';
import AccessCodeModal from '@/app/components/AccessCodeModal';

type ChatMessage = {
  role: string;
  content: string;
  debug?: any;
};

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: Date;
};

// Kunci penyimpanan khusus di browser cache / localStorage
const BROWSER_CACHE_KEY = 'makkah_ai_pustaka_sessions';

export default function AiPustakaPage() {
  const router = useRouter();
  const defaultGreeting: ChatMessage = {
    role: 'assistant',
    content: 'Assalamu’alaikum! Saya Asisten AI **Sahabat MTA**. Silakan ajukan pertanyaan seputar fiqih, dalil hadits, dan materi Brosur Ahad Pagi MTA. Percakapan ini tersimpan secara privat di perangkat Anda.'
  };

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [simInput, setSimInput] = useState('');
  const [isSimulating, setIsSimulating] = useState<'idle' | 'searching' | 'generating'>('idle');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  // States untuk Copy, Edit Prompt & Share
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [shareSuccessIndex, setShareSuccessIndex] = useState<number | null>(null);

  // Ref untuk auto-scroll ke bawah saat loading/pesan baru
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    // 1. Cek izin kode akses premium
    if (typeof window !== 'undefined') {
      const code = localStorage.getItem('mta_premium_access');
      if (!code) {
        setIsAccessModalOpen(true);
      }
    }

    // 2. Cek query parameter 'q' untuk prefill kueri dari beranda
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        setSimInput(decodeURIComponent(q));
      }
    }

    // 3. Muat sesi dari Cache Browser (LocalStorage)
    loadSessionsFromCache();
  }, []);

  const containsArabic = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  // Helper untuk membaca dari Cache Browser
  const getCachedSessions = (): ChatSession[] => {
    try {
      const saved = localStorage.getItem(BROWSER_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            updatedAt: new Date(s.updatedAt || Date.now())
          }));
        }
      }
    } catch (e) {
      console.warn('Gagal membaca cache browser:', e);
    }
    return [];
  };

  // Helper untuk menyimpan ke Cache Browser
  const persistToBrowserCache = (updatedSessions: ChatSession[]) => {
    try {
      localStorage.setItem(BROWSER_CACHE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.warn('Gagal menyimpan ke cache browser:', e);
    }
  };

  const loadSessionsFromCache = () => {
    setIsLoading(true);
    let loadedSessions = getCachedSessions();

    // Jika cache kosong, inisialisasi sesi pertama
    if (loadedSessions.length === 0) {
      const initialSession: ChatSession = {
        id: 'cache-session-' + Date.now(),
        title: 'Percakapan Baru',
        messages: [defaultGreeting],
        updatedAt: new Date()
      };
      loadedSessions = [initialSession];
      persistToBrowserCache(loadedSessions);
    }

    setSessions(loadedSessions);
    setActiveSessionId(loadedSessions[0].id);
    setIsLoading(false);
  };

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: 'cache-session-' + Date.now(),
      title: 'Percakapan Baru',
      messages: [defaultGreeting],
      updatedAt: new Date(),
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    persistToBrowserCache(updated);
    setEditingIndex(null);
  };

  const handleDeleteSession = (id: string) => {
    if (!window.confirm('Hapus sesi percakapan ini dari cache browser?')) return;

    const nextSessions = sessions.filter(s => s.id !== id);
    setSessions(nextSessions);
    persistToBrowserCache(nextSessions);

    if (activeSessionId === id && nextSessions.length > 0) {
      setActiveSessionId(nextSessions[0].id);
    } else if (nextSessions.length === 0) {
      handleNewSession();
    }
    setEditingIndex(null);
  };

  const handleClearAllCache = () => {
    if (!window.confirm('Bersihkan seluruh riwayat percakapan AI dari cache browser?')) return;
    localStorage.removeItem(BROWSER_CACHE_KEY);
    const initialSession: ChatSession = {
      id: 'cache-session-' + Date.now(),
      title: 'Percakapan Baru',
      messages: [defaultGreeting],
      updatedAt: new Date()
    };
    setSessions([initialSession]);
    setActiveSessionId(initialSession.id);
    persistToBrowserCache([initialSession]);
    setEditingIndex(null);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'fallback-session',
    title: 'Percakapan Baru',
    messages: [defaultGreeting],
    updatedAt: new Date()
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages, isSimulating]);

  // Helper untuk Copy Teks ke Clipboard
  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper untuk Berbagi (Share)
  const handleShareText = async (text: string, title: string, index: number) => {
    const shareContent = `${text}\n\n— Sumber: AI Sahabat Pustaka MTA`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Tanya Jawab AI Sahabat MTA: ${title}`,
          text: shareContent,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // Fallback jika ditutup oleh pengguna
      }
    }

    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(shareContent);
    setShareSuccessIndex(index);
    setTimeout(() => setShareSuccessIndex(null), 2500);
  };

  // Helper Inti Pengiriman & Rebuild AI Chat
  const handleSendQuery = async (messagesToSend: ChatMessage[]) => {
    if (isSimulating !== 'idle') return;

    try {
      setIsSimulating('generating');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend, wordCount: 500 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan sistem');

      const finalMessages = [...messagesToSend, { role: 'assistant', content: data.text, debug: data.debug_log }];

      const finalizedSessions = sessions.map(s =>
        s.id === activeSession.id
          ? { ...s, messages: finalMessages, updatedAt: new Date() }
          : s
      );
      setSessions(finalizedSessions);
      persistToBrowserCache(finalizedSessions);
    } catch (err: any) {
      const finalMessages = [
        ...messagesToSend,
        { role: 'assistant', content: `Mohon maaf, terjadi kendala: ${err.message}`, debug: { error: err.message } }
      ];
      const errorSessions = sessions.map(s =>
        s.id === activeSession.id
          ? { ...s, messages: finalMessages, updatedAt: new Date() }
          : s
      );
      setSessions(errorSessions);
      persistToBrowserCache(errorSessions);
    } finally {
      setIsSimulating('idle');
    }
  };

  // Fungsi Edit Prompt & Rebuild Ulang Jawaban AI
  const handleSaveAndRebuildPrompt = async (index: number) => {
    if (!editInputText.trim() || isSimulating !== 'idle') return;

    const newText = editInputText.trim();
    setEditingIndex(null);
    setEditInputText('');

    // Potong percakapan sampai posisi prompt ini saja (re-branching)
    const messagesBefore = activeSession.messages.slice(0, index);
    const updatedUserMsg: ChatMessage = { role: 'user', content: newText };
    const newMessages = [...messagesBefore, updatedUserMsg];

    let updatedTitle = activeSession.title;
    if (index === 1 || activeSession.messages.length <= 2) {
      updatedTitle = newText.substring(0, 32) + (newText.length > 32 ? '...' : '');
    }

    const nextSessions = sessions.map(s =>
      s.id === activeSession.id
        ? { ...s, title: updatedTitle, messages: newMessages, updatedAt: new Date() }
        : s
    );
    setSessions(nextSessions);
    persistToBrowserCache(nextSessions);

    // Jalankan rebuild ulang ke AI
    await handleSendQuery(newMessages);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#fafaf9] font-sans items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-sm font-bold text-slate-700">Membuka AI Pustaka MTA...</p>
          <p className="text-xs text-slate-400">Memuat riwayat dari cache browser lokal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />

      {/* SINGLE UNIFIED SIDEBAR (Portal + Riwayat AI) */}
      <MainSidebar
        aiMode={true}
        aiSessions={sessions}
        activeAiSessionId={activeSessionId}
        onNewAiSession={handleNewSession}
        onAiSessionClick={setActiveSessionId}
        onAiSessionDelete={handleDeleteSession}
        onClearAiSessions={handleClearAllCache}
      />

      {/* MAIN CHAT WORKSPACE (Luas, bersih, tanpa sidebar ganda) */}
      <main className="flex-1 flex flex-col relative h-full bg-white overflow-hidden min-w-0">

        {/* Header Bar Modern */}
        <header className="h-16 sticky top-0 left-0 right-0 px-4 sm:px-6 flex items-center justify-between z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-main-sidebar'))}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition shadow-2xs shrink-0 cursor-pointer"
              title="Buka/Tutup Sidebar"
            >
              <Menu size={18} />
            </button>

            <Link
              href="/"
              className="p-2 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shrink-0"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Beranda</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1" />

            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <span className="font-extrabold text-sm text-slate-800 truncate">
                {activeSession.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Tombol Buat Percakapan Baru Cepat di Header */}
            <button
              type="button"
              onClick={handleNewSession}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-1.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Percakapan Baru</span>
            </button>

            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold shadow-2xs">
              <HardDrive size={12} className="text-emerald-600" />
              <span>Cache Browser Privat</span>
            </span>
          </div>
        </header>

        {/* WORKSPACE CHAT UTAMA: Ruang lapang & terpusat */}
        <div className="flex-1 flex flex-col h-full relative bg-white min-w-0 overflow-hidden">

          {/* Thread Percakapan */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-36">
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map((msg, i) => (
                <div key={i} className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role !== 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Bot size={15} />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${msg.role === 'user'
                    ? 'w-full sm:max-w-[80%]'
                    : 'text-slate-800 py-1 flex-1 min-w-0'
                    }`}>
                    {msg.role === 'user' ? (
                      editingIndex === i ? (
                        // Mode Inline Edit Prompt dengan Tombol Batal & Rebuild
                        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-3 shadow-xs space-y-2.5 text-left">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Edit Pertanyaan
                          </div>
                          <textarea
                            value={editInputText}
                            onChange={(e) => setEditInputText(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none min-h-[75px]"
                            autoFocus
                            rows={2}
                          />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => { setEditingIndex(null); setEditInputText(''); }}
                              className="px-3 py-1.5 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-semibold transition cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={!editInputText.trim() || isSimulating !== 'idle'}
                              onClick={() => handleSaveAndRebuildPrompt(i)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                            >
                              <RotateCcw size={12} />
                              <span>Simpan & Rebuild Ulang</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Tampilan Normal Bubble Prompt Pengguna + Action Buttons
                        <div className="group relative flex flex-col items-end">
                          <div className="bg-emerald-600 text-white rounded-2xl py-2.5 px-4 text-xs sm:text-[13px] font-medium shadow-xs leading-relaxed text-left">
                            {msg.content}
                          </div>

                          {/* Action Button: Copy Prompt & Edit Prompt (Tampil saat hover / fokus) */}
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.content, i)}
                              className="p-1 px-2 text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Salin Pertanyaan"
                            >
                              {copiedIndex === i ? (
                                <>
                                  <Check size={11} className="text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(i);
                                setEditInputText(msg.content);
                              }}
                              className="p-1 px-2 text-[11px] text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Edit Pertanyaan & Rebuild Ulang"
                            >
                              <Pencil size={11} />
                              <span>Edit & Rebuild</span>
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      // Tampilan Balasan AI
                      <div className="text-xs sm:text-[13px] leading-relaxed space-y-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => {
                              const textContent = React.Children.toArray(children).join('');
                              if (containsArabic(textContent)) {
                                return (
                                  <p className="text-[17px] sm:text-[19px] leading-[2.1] text-right py-2.5 px-4 bg-slate-50 border border-slate-100 rounded-xl my-2 text-slate-900 font-arabic" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}>
                                    {children}
                                  </p>
                                );
                              }
                              return <p className="mb-2.5 text-slate-700 leading-normal">{children}</p>;
                            },
                            strong: ({ ...props }) => <strong {...props} className="font-extrabold text-slate-900" />,
                            ul: ({ ...props }) => <ul {...props} className="list-disc pl-4 mb-2 space-y-1 text-slate-700" />,
                            ol: ({ ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1 text-slate-700" />,
                            li: ({ ...props }) => <li {...props} className="leading-snug" />,
                            h1: ({ ...props }) => <h1 {...props} className="text-sm sm:text-base font-extrabold mb-1 mt-3 text-slate-900" />,
                            h2: ({ ...props }) => <h2 {...props} className="text-xs sm:text-sm font-bold mb-1 mt-2 text-slate-900" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {/* Rujukan Brosur Terkait (Bersih tanpa kata Penalaran RAG) */}
                        {msg.debug?.retrieved_docs && msg.debug.retrieved_docs.length > 0 && (
                          <details className="mt-3 border border-slate-200/90 rounded-xl p-2.5 text-[11px] bg-slate-50/70 font-sans">
                            <summary className="cursor-pointer text-slate-600 font-semibold select-none flex items-center gap-1.5 hover:text-slate-900">
                              <BookOpen size={13} className="text-emerald-600" />
                              <span>Rujukan Brosur Ahad Pagi ({msg.debug.retrieved_docs.length} Brosur)</span>
                            </summary>
                            <div className="mt-2 space-y-1 text-slate-600 pt-2 border-t border-slate-200/70">
                              <ul className="list-disc pl-4 space-y-0.5">
                                {msg.debug.retrieved_docs.map((d: any, idx: number) => (
                                  <li key={idx} className="leading-snug">
                                    <span className="font-semibold text-slate-800">{d.judul}</span>
                                    {d.tahun && <span className="text-slate-500"> (Tahun {d.tahun})</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </details>
                        )}

                        {/* Action Bar: Salin Jawaban & Bagikan (Share) */}
                        {i > 0 && (
                          <div className="flex items-center gap-2 pt-2 text-[11px] border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.content, i)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition font-medium cursor-pointer"
                              title="Salin Hasil Jawaban"
                            >
                              {copiedIndex === i ? (
                                <>
                                  <Check size={12} className="text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Salin Jawaban</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareText(msg.content, activeSession.title, i)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition font-medium cursor-pointer"
                              title="Bagikan Jawaban Ini"
                            >
                              {shareSuccessIndex === i ? (
                                <>
                                  <Check size={12} className="text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Tersalin ke Clipboard!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 size={12} />
                                  <span>Bagikan</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Kartu Loading Interaktif saat AI Sedang Bekerja */}
              {isSimulating !== 'idle' && (
                <div className="flex gap-3.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-2xs animate-pulse">
                    <Bot size={15} />
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 w-full sm:max-w-[75%] space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800">
                      {/* <Sparkles size={14} className="animate-spin text-emerald-600" /> */}
                      <span className="animate-pulse">Sahabat MTA sedang menelaah dalil & menyusun jawaban...</span>
                    </div>

                    {/* Animated Skeleton Shimmer Lines */}
                    <div className="space-y-2 pt-0.5">
                      <div className="h-2.5 bg-slate-200/80 rounded-full w-5/6 animate-pulse" />
                      <div className="h-2.5 bg-slate-200/60 rounded-full w-4/6 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="h-2.5 bg-slate-200/40 rounded-full w-3/6 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>

                    {/* Bouncing Dots Status */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[11px] text-slate-400 font-medium ml-1.5">Menganalisis korpus brosur & dalil...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Anchor untuk auto-scroll ke dasar chat */}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>

          {/* Input Bar Fixed di Bawah */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-8 pb-4 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!simInput.trim() || isSimulating !== 'idle') return;

                  const userMsg = simInput.trim();
                  setSimInput('');

                  const newMessages = [...activeSession.messages, { role: 'user', content: userMsg }];

                  let updatedTitle = activeSession.title;
                  if (activeSession.messages.length === 1) {
                    updatedTitle = userMsg.substring(0, 32) + (userMsg.length > 32 ? '...' : '');
                  }

                  // Simpan ke Cache Browser Seketika
                  const nextSessions = sessions.map(s =>
                    s.id === activeSession.id
                      ? { ...s, title: updatedTitle, messages: newMessages, updatedAt: new Date() }
                      : s
                  );
                  setSessions(nextSessions);
                  persistToBrowserCache(nextSessions);

                  await handleSendQuery(newMessages);
                }}
                className="bg-slate-100 border border-slate-200 rounded-2xl p-1.5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 focus-within:bg-white transition shadow-xs"
              >
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Tanyakan fatwa, topik fiqih, atau dalil ke Sahabat MTA..."
                  className="flex-1 bg-transparent border-none px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  disabled={isSimulating !== 'idle'}
                />
                <button
                  type="submit"
                  disabled={!simInput.trim() || isSimulating !== 'idle'}
                  className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                  title={isSimulating !== 'idle' ? "AI sedang bekerja..." : "Kirim Pertanyaan"}
                >
                  {isSimulating !== 'idle' ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </form>
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 mt-1.5">
                <ShieldCheck size={11} className="text-emerald-600" />
                <span>Riwayat percakapan disimpan privat di cache browser Anda.</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Access Code Modal jika pengguna belum login kode premium */}
      <AccessCodeModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onSuccess={(code) => {
          setIsAccessModalOpen(false);
        }}
      />
    </div>
  );
}
