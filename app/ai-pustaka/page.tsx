'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot, Plus, Trash2,
  RefreshCw, Send, ArrowLeft, Menu, ShieldCheck, HardDrive,
  Copy, Check, Share2, Pencil, RotateCcw, BookOpen, Sparkles, Loader2,
  ScrollText, Compass, CheckCircle2, FastForward, Clock, Flame, History, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  dbSessionId?: string;
  slug?: string;
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
    content: 'Assalamu’alaikum! Saya Asisten AI **Sahabat MTA**. Silakan ajukan pertanyaan seputar materi, dalil hadits, dan materi Brosur Ahad Pagi MTA. Percakapan ini tersimpan secara privat di perangkat Anda.'
  };

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAiGate, setShowAiGate] = useState(true);
  const [simInput, setSimInput] = useState('');
  const [isSimulating, setIsSimulating] = useState<'idle' | 'searching' | 'generating'>('idle');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  // Daftar Chat Terbaru & Chat Terpopuler dari Database Supabase (Tetap ada meskipun cache lokal dihapus)
  const [recentDbChats, setRecentDbChats] = useState<{ id: string; slug?: string; title: string; query: string; category?: string; sessionMessages?: any[] }[]>([]);
  const [popularDbChats, setPopularDbChats] = useState<{ id: string; slug?: string; title: string; query: string; count?: number; category?: string; sessionMessages?: any[] }[]>([]);

  // States untuk Copy, Edit Prompt & Share
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [shareSuccessIndex, setShareSuccessIndex] = useState<number | null>(null);

  // States untuk Efek Mengetik (Typewriter) & Agentic Thinking Steps (Ala Gambar Referensi)
  const [thinkingStage, setThinkingStage] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activePromptForThinking, setActivePromptForThinking] = useState('');
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);
  const [typingCharCount, setTypingCharCount] = useState<number>(0);

  // Animasi typing untuk Canvas Greeting (Misal: "Assalamu'alaikum, Ustadz...")
  const fullGreetingText = "Assalamu'alaikum, Ustadz";
  const [heroTypingCharCount, setHeroTypingCharCount] = useState<number>(0);

  // Bangun daftar langkah berpikir dinamis berdasarkan topik pertanyaan pengguna saat ini
  const getDynamicThinkingSteps = (queryText: string) => {
    const cleanQ = (queryText || 'materi')
      .replace(/^(carikan|tolong|bagaimana|apa|apakah|jelaskan|rukun|syarat|sah|dan|adab)\s+/gi, '')
      .trim()
      .slice(0, 48);
    const topicLabel = cleanQ || queryText.slice(0, 40) || 'materi & dalil';

    return [
      'Membaca Khazanah Pustaka Brosur Ahad Pagi MTA...',
      `Menelusuri perkembangan materi "${topicLabel}" (1995–2026)...`,
      `Mencari "${topicLabel}" di arsip brosur & indeks matan hadits...`,
      `Membaca sub-bab & dalil utama terkait: ${topicLabel}`,
      'Memeriksa keutuhan teks Arab, harakat, dan perawi hadits...',
      'Menyusun penjelasan beserta rujukan terverifikasi...'
    ];
  };

  const liveThinkingSteps = getDynamicThinkingSteps(activePromptForThinking);
  const thinkingStages = liveThinkingSteps;

  const starterSuggestions = [
    {
      title: 'Dalil Aqiqah Hari ke-7',
      prompt: 'Carikan dalil hadits aqiqah di hari ke-7 lengkap dengan teks Arab, terjemah, dan penjelasan brosurnya',
      badge: 'Kajian Keluarga'
    },
    {
      title: 'Hukum & Tata Cara Shalat Tahajud',
      prompt: 'Bagaimana tuntunan shalat tahajud dan witir beserta dalil haditsnya di Brosur Ahad Pagi?',
      badge: 'Ibadah Sunnah'
    },
    {
      title: 'Adab & Hukum Jual Beli dalam Islam',
      prompt: 'Jelaskan dalil-dalil tentang jual beli yang dilarang dalam Islam menurut Brosur MTA',
      badge: 'Muamalah'
    },
    {
      title: 'Keutamaan Membaca Al-Qur\'an',
      prompt: 'Apa saja dalil ayat dan hadits tentang keutamaan membaca serta mentadabburi Al-Qur\'an?',
      badge: 'Tazkiyatun Nafs'
    }
  ];

  // Ref untuk auto-scroll ke bawah saat loading/pesan baru
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fungsi untuk memuat "Chat Terbaru" & "Chat Terpopuler" dari Database Supabase
  const fetchDatabaseChatFeeds = async () => {
    try {
      const res = await fetch('/api/ai/chat', { method: 'GET' });
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.recentChats)) setRecentDbChats(data.recentChats);
        if (Array.isArray(data.popularChats)) setPopularDbChats(data.popularChats);
      }
    } catch (e) {
      console.warn('Gagal memuat feed database AI:', e);
    }
  };

  // Sinkronkan slug ke URL browser tanpa reload
  const syncSlugToUrl = (slug?: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set('slug', slug);
    } else {
      url.searchParams.delete('slug');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Muat sesi dari Database berdasarkan slug URL (misal: /ai-pustaka?slug=rukun-syarat-pernikahan-99a2ab)
  const loadSessionBySlugFromDb = async (slugParam: string) => {
    try {
      const res = await fetch(`/api/ai/chat?slug=${encodeURIComponent(slugParam)}`);
      const data = await res.json();
      if (data && data.success && data.session) {
        const dbSess = data.session;
        const restored: ChatSession = {
          id: `db-${dbSess.id}`,
          dbSessionId: dbSess.id,
          slug: dbSess.slug || slugParam,
          title: dbSess.title || 'Percakapan AI',
          messages: Array.isArray(dbSess.messages) && dbSess.messages.length > 0 ? dbSess.messages : [defaultGreeting],
          updatedAt: new Date(dbSess.updatedAt || Date.now()),
        };

        setSessions((prev) => {
          const exists = prev.some((s) => s.slug === restored.slug || s.dbSessionId === restored.dbSessionId);
          const next = exists
            ? prev.map((s) => (s.slug === restored.slug || s.dbSessionId === restored.dbSessionId ? restored : s))
            : [restored, ...prev];
          persistToBrowserCache(next);
          return next;
        });
        setActiveSessionId(restored.id);
        syncSlugToUrl(restored.slug);
      }
    } catch (e) {
      console.warn('Gagal membuka sesi berdasarkan slug:', e);
    }
  };

  useEffect(() => {
    // 1. Izinkan semua akses tanpa blokir modal (allow all)
    if (typeof window !== 'undefined' && !localStorage.getItem('mta_premium_access')) {
      localStorage.setItem('mta_premium_access', 'allowed');
    }
    setIsAccessModalOpen(false);

    // 2. Muat sesi dari Cache Browser (LocalStorage) & Muat Feed Database
    loadSessionsFromCache();
    fetchDatabaseChatFeeds();

    // 3. Cek parameter URL 'slug' (buka hasil chat dari database) atau 'q' (prefill kueri dari beranda)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const slugParam = params.get('slug');
      const q = params.get('q');
      if (slugParam) {
        loadSessionBySlugFromDb(decodeURIComponent(slugParam));
      } else if (q) {
        setSimInput(decodeURIComponent(q));
      }
    }

    // 4. Animasi Gerbang AI (AI Portal Gate) saat pertama kali masuk halaman
    const gateTimer = setTimeout(() => {
      setShowAiGate(false);
    }, 1550);
    return () => clearTimeout(gateTimer);
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
    syncSlugToUrl(undefined);
  };

  const handleDeleteSession = (id: string) => {
    if (!window.confirm('Hapus percakapan ini dari daftar "Chat Saya" di perangkat ini? (Arsip & tautan slug di database tetap tersimpan)')) return;

    const nextSessions = sessions.filter(s => s.id !== id);
    setSessions(nextSessions);
    persistToBrowserCache(nextSessions);

    if (activeSessionId === id && nextSessions.length > 0) {
      setActiveSessionId(nextSessions[0].id);
      syncSlugToUrl(nextSessions[0].slug);
    } else if (nextSessions.length === 0) {
      handleNewSession();
    }
    setEditingIndex(null);
  };

  const handleClearAllCache = () => {
    if (!window.confirm('Bersihkan hanya cache "Chat Saya" di browser ini? Seluruh riwayat di Database (Chat Terbaru, Terpopuler, & Tautan Slug) tetap aman tersimpan.')) return;
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
    syncSlugToUrl(undefined);
  };

  // Ketika pengguna memilih item dari "Chat Terbaru" atau "Chat Terpopuler" di Sidebar
  const handleSelectCommunityChat = async (item: { id?: string; slug?: string; title: string; query: string; sessionMessages?: any[] }) => {
    if (isSimulating !== 'idle') return;
    setEditingIndex(null);
    setTypingMessageIndex(null);

    // 1. Jika item sudah memiliki riwayat messages utuh dari tabel ai_simulator_sessions, buka langsung + set slug URL
    if (item.sessionMessages && Array.isArray(item.sessionMessages) && item.sessionMessages.length > 1) {
      const restoredSession: ChatSession = {
        id: item.slug ? `db-${item.slug}` : 'restored-session-' + Date.now(),
        dbSessionId: item.id && !item.id.startsWith('log-') && !item.id.startsWith('pop-') ? item.id : undefined,
        slug: item.slug,
        title: item.title,
        messages: item.sessionMessages,
        updatedAt: new Date(),
      };
      const exists = sessions.some((s) => (item.slug && s.slug === item.slug) || s.id === restoredSession.id);
      const updated = exists
        ? sessions.map((s) => ((item.slug && s.slug === item.slug) || s.id === restoredSession.id ? restoredSession : s))
        : [restoredSession, ...sessions];
      setSessions(updated);
      setActiveSessionId(restoredSession.id);
      persistToBrowserCache(updated);
      syncSlugToUrl(restoredSession.slug);
      return;
    }

    // 2. Jika item punya slug database, coba muat sesi lengkapnya dari database berdasarkan slug
    if (item.slug && !item.slug.endsWith('-def001') && !item.slug.endsWith('-def002') && !item.slug.endsWith('-def003') && !item.slug.endsWith('-def004') && !item.slug.endsWith('-def005')) {
      try {
        const res = await fetch(`/api/ai/chat?slug=${encodeURIComponent(item.slug)}`);
        const data = await res.json();
        if (data && data.success && data.session && Array.isArray(data.session.messages) && data.session.messages.length > 1) {
          const dbSess = data.session;
          const restored: ChatSession = {
            id: `db-${dbSess.id}`,
            dbSessionId: dbSess.id,
            slug: dbSess.slug || item.slug,
            title: dbSess.title || item.title,
            messages: dbSess.messages,
            updatedAt: new Date(dbSess.updatedAt || Date.now()),
          };
          const updated = [restored, ...sessions.filter((s) => s.slug !== restored.slug)];
          setSessions(updated);
          setActiveSessionId(restored.id);
          persistToBrowserCache(updated);
          syncSlugToUrl(restored.slug);
          return;
        }
      } catch (_) { }
    }

    // 3. Jika belum ada sesi lengkapnya di DB, jalankan kueri tersebut dan otomatis buatkan slug baru di DB
    await handleSelectStarterPrompt(item.query || item.title);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'fallback-session',
    title: 'Percakapan Baru',
    messages: [defaultGreeting],
    updatedAt: new Date()
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages, isSimulating, typingCharCount]);

  // Siklus tahap berpikir (Agentic Thinking Steps) & penghitung detik saat AI bekerja
  useEffect(() => {
    if (isSimulating === 'idle') {
      setThinkingStage(0);
      setElapsedSeconds(0);
      return;
    }
    const stageTimer = setInterval(() => {
      setThinkingStage((prev) => (prev < liveThinkingSteps.length - 1 ? prev + 1 : prev));
    }, 1100);
    const secTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(stageTimer);
      clearInterval(secTimer);
    };
  }, [isSimulating, liveThinkingSteps.length]);

  // Efek mengetik (Typewriter) halus saat balasan AI baru muncul
  useEffect(() => {
    if (typingMessageIndex === null) return;
    const msg = activeSession.messages[typingMessageIndex];
    if (!msg || msg.role !== 'assistant') {
      setTypingMessageIndex(null);
      return;
    }

    const totalLen = msg.content.length;
    if (typingCharCount >= totalLen) {
      setTypingMessageIndex(null);
      return;
    }

    const step = Math.max(12, Math.ceil(totalLen / 95));
    const timer = setTimeout(() => {
      setTypingCharCount((prev) => Math.min(totalLen, prev + step));
    }, 22);

    return () => clearTimeout(timer);
  }, [typingMessageIndex, typingCharCount, activeSession.messages]);

  // Efek mengetik (Typewriter) hero greeting "Assalamu'alaikum, Ustadz" di canvas awal
  useEffect(() => {
    if (heroTypingCharCount >= fullGreetingText.length) return;
    const timer = setTimeout(() => {
      setHeroTypingCharCount((prev) => prev + 1);
    }, 45);
    return () => clearTimeout(timer);
  }, [heroTypingCharCount, fullGreetingText.length]);

  // Helper untuk Copy Teks ke Clipboard
  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper untuk Berbagi (Share) beserta tautan langsung Slug Hasil Chat
  const handleShareText = async (text: string, title: string, index: number) => {
    const shareUrl = typeof window !== 'undefined'
      ? (activeSession.slug ? `${window.location.origin}/ai-pustaka?slug=${encodeURIComponent(activeSession.slug)}` : window.location.href)
      : '';
    const shareContent = `${text}\n\n🔗 Buka hasil telaah & rujukan lengkap: ${shareUrl}\n— Sumber: AI Sahabat Pustaka MTA`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Tanya Jawab AI Sahabat MTA: ${title}`,
          text: shareContent,
          url: shareUrl,
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

    const latestUserMsg = messagesToSend[messagesToSend.length - 1]?.content || '';
    setActivePromptForThinking(latestUserMsg);
    setThinkingStage(0);
    setElapsedSeconds(1);

    try {
      setIsSimulating('generating');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          dbSessionId: activeSession.dbSessionId,
          sessionSlug: activeSession.slug,
          sessionTitle: latestUserMsg.substring(0, 42) + (latestUserMsg.length > 42 ? '...' : ''),
          wordCount: 500
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan sistem');

      const finalMessages = [...messagesToSend, { role: 'assistant', content: data.text, debug: data.debug_log }];
      const returnedSlug = data.slug || activeSession.slug;
      const returnedDbId = data.dbSessionId || activeSession.dbSessionId;

      const finalizedSessions = sessions.map(s =>
        s.id === activeSession.id
          ? {
            ...s,
            dbSessionId: returnedDbId,
            slug: returnedSlug,
            messages: finalMessages,
            updatedAt: new Date()
          }
          : s
      );
      setSessions(finalizedSessions);
      persistToBrowserCache(finalizedSessions);
      if (returnedSlug) {
        syncSlugToUrl(returnedSlug);
      }

      // Segarkan daftar Chat Terbaru & Terpopuler dari Database
      fetchDatabaseChatFeeds();

      // Mulai animasi mengetik (typewriter) untuk balasan terbaru
      setTypingMessageIndex(finalMessages.length - 1);
      setTypingCharCount(24);
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

  // Fungsi kirim cepat dari Kartu Saran / Starter Prompt ala Gemini
  const handleSelectStarterPrompt = async (promptText: string) => {
    if (isSimulating !== 'idle') return;
    setSimInput('');
    setTypingMessageIndex(null);

    const newMessages = [...activeSession.messages, { role: 'user', content: promptText }];
    const updatedTitle = promptText.substring(0, 34) + (promptText.length > 34 ? '...' : '');

    const nextSessions = sessions.map(s =>
      s.id === activeSession.id
        ? { ...s, title: updatedTitle, messages: newMessages, updatedAt: new Date() }
        : s
    );
    setSessions(nextSessions);
    persistToBrowserCache(nextSessions);

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

      {/* ANIMASI GERBANG AI (AI PORTAL GATE) SAAT PERTAMA KALI MASUK /ai-pustaka */}
      <AnimatePresence>
        {showAiGate && (
          <motion.div
            key="ai-portal-gate-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06, filter: 'blur(12px)' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setShowAiGate(false)}
            className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white overflow-hidden select-none cursor-pointer"
          >
            {/* Lapisan Cincin Cahaya Portal */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.8, 1.35, 1.8], opacity: [0.4, 0.25, 0] }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="absolute w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] rounded-full border border-emerald-400/30 pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.7, 1.15, 1.45], opacity: [0.5, 0.3, 0] }}
              transition={{ duration: 1.5, delay: 0.15, ease: 'easeOut' }}
              className="absolute w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] rounded-full border border-teal-300/40 pointer-events-none"
            />

            {/* Pendaran Cahaya Inti Gerbang */}
            <div className="absolute w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

            {/* Ikon & Tipografi Gerbang AI */}
            <motion.div
              initial={{ y: 18, scale: 0.88, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative z-10 flex flex-col items-center text-center px-6 space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-500/40 ring-1 ring-white/30">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/90 font-normal">
                  Memasuki Gerbang Telaah Digital
                </p>
                <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-white">
                  AI Sahabat Pustaka MTA
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/75 font-normal max-w-md">
                  Menghubungkan khazanah Brosur Ahad Pagi (1995–2026) & 16.800+ indeks matan hadits...
                </p>
              </div>

              {/* Garis cahaya pembuka gerbang */}
              <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden mt-2">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.15, ease: 'easeInOut' }}
                  className="w-full h-full bg-gradient-to-r from-transparent via-emerald-300 to-transparent"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE UNIFIED SIDEBAR (Portal + Chat Saya, Chat Terbaru, Chat Terpopuler) */}
      <MainSidebar
        aiMode={true}
        aiSessions={sessions}
        recentAiChats={recentDbChats}
        popularAiChats={popularDbChats}
        activeAiSessionId={activeSessionId}
        onNewAiSession={handleNewSession}
        onAiSessionClick={setActiveSessionId}
        onAiSessionDelete={handleDeleteSession}
        onClearAiSessions={handleClearAllCache}
        onSelectCommunityChat={handleSelectCommunityChat}
      />

      {/* MAIN CHAT WORKSPACE (Luas, bersih, tanpa sidebar ganda) */}
      <main className="flex-1 flex flex-col relative h-full bg-white overflow-hidden min-w-0">

        {/* Header Bar Modern Clean dengan Menu Riwayat & Feed */}
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
              className="p-2 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-normal rounded-lg hover:bg-slate-50 transition shrink-0"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Beranda</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1" />

            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={16} />
              </div>
              <span className="font-normal text-[15px] text-slate-900 truncate">
                {activeSession.title}
              </span>
            </div>
          </div>

          {/* Header Action: Cukup 1 Tombol Bersih "Riwayat" yang Mengarahkan ke /ai-pustaka/riwayat */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/ai-pustaka/riwayat"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-normal transition cursor-pointer border bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300 shadow-2xs"
              title="Buka Halaman Riwayat & Percakapan AI"
            >
              <History size={14} className="text-emerald-600" />
              <span>Riwayat</span>
            </Link>
          </div>
        </header>

        {/* TOP LOADER BAR & STATUS SEARCHING DI ATAS WORKSPACE SAAT AI SEDANG BERPIKIR */}
        <AnimatePresence>
          {isSimulating !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="sticky top-16 left-0 right-0 z-30 bg-emerald-50/95 backdrop-blur-md border-b border-emerald-200/80 shadow-xs"
            >
              {/* Shimmering Progress Line di Paling Atas */}
              <div className="h-1 w-full bg-emerald-100 overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 w-1/2 rounded-full"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                />
              </div>

              <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-[13px]">
                <div className="flex items-center gap-2.5 text-emerald-900 font-bold truncate">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  <span className="truncate">{thinkingStages[thinkingStage]}</span>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[11px] font-extrabold shrink-0">
                  Target: 10–20 Rujukan
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WORKSPACE CHAT UTAMA: Ruang lapang & terpusat */}
        <div className="flex-1 flex flex-col h-full relative bg-white min-w-0 overflow-hidden">

          {/* Thread Percakapan dengan Padding Bawah Profesional (pb-48 sm:pb-52) */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 space-y-6 pb-48 sm:pb-52">
            <div className="max-w-3xl mx-auto space-y-7">

              {/* GEMINI-STYLE AI ENTRANCE HERO (Clean Canvas dengan Animasi Typing: Assalamu'alaikum, Ustadz) */}
              {activeSession.messages.length <= 1 && isSimulating === 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="pt-4 pb-4 space-y-7"
                >
                  {/* Clean Canvas Greeting dengan Animasi Typing */}
                  <div className="text-left space-y-3 py-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-normal border border-emerald-200/60">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AI Sahabat MTA</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-slate-800 flex items-center gap-1">
                      <span>{fullGreetingText.slice(0, heroTypingCharCount)}</span>
                      {heroTypingCharCount < fullGreetingText.length && (
                        <span className="w-2.5 h-7 bg-emerald-600 animate-pulse inline-block ml-0.5 rounded-sm" />
                      )}
                    </h2>

                    <p className="text-slate-500 text-sm sm:text-base font-normal max-w-xl leading-relaxed">
                      Silakan ajukan pertanyaan seputar Materi Brosur, dalil ibadah, atau materi kajian Brosur Ahad Pagi.
                    </p>
                  </div>

                  {/* Grid 4 Kartu Saran Topik Cepat Clean & Minimalis */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-normal text-slate-400 uppercase tracking-wider">
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mulai Telaah Cepat</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {starterSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectStarterPrompt(item.prompt)}
                          className="group text-left p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 transition-all shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between gap-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-normal uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100/70 group-hover:text-emerald-800 transition-colors">
                              {item.badge}
                            </span>
                            <Sparkles className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                          </div>
                          <div>
                            <h3 className="text-[14.5px] font-normal text-slate-800 group-hover:text-emerald-900 transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-400 group-hover:text-slate-500 line-clamp-2 mt-1 leading-relaxed font-normal">
                              {item.prompt}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
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
                      // Tampilan Balasan AI dengan Agentic Thinking Steps (Ala Referensi), Efek Mengetik & Jarak Baris Profesional
                      <div className="text-[14px] sm:text-[15px] leading-[1.85] space-y-4">
                        {/* Riwayat Langkah Pembacaan AI (Agentic Thinking Steps seperti Gambar Referensi) */}
                        {msg.debug?.thinking_steps && msg.debug.thinking_steps.length > 0 && (
                          <details className="group border border-slate-200/80 rounded-2xl bg-slate-50/70 px-4 py-2.5 text-xs sm:text-[13px] transition-all">
                            <summary className="cursor-pointer select-none flex items-center justify-between gap-2 text-slate-600 hover:text-slate-900 font-medium list-none">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-emerald-600 font-extrabold">✓</span>
                                <span className="truncate">
                                  Telah membaca & menelaah{' '}
                                  <strong className="text-slate-800 font-bold">
                                    {msg.debug?.retrieved_docs?.length || msg.debug.thinking_steps.length} rujukan relevan
                                  </strong>
                                  {msg.debug?.latency_sec ? ` · ${msg.debug.latency_sec} dtk` : ''}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-emerald-700 group-open:rotate-180 transition-transform shrink-0">
                                ▾
                              </span>
                            </summary>

                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-1.5 text-slate-600 font-normal">
                              {msg.debug.thinking_steps.map((stepText: string, sIdx: number) => (
                                <div key={sIdx} className="flex items-start gap-2.5 leading-relaxed">
                                  <span className="text-slate-500 font-bold select-none shrink-0">✓</span>
                                  <span className="text-slate-600">{stepText}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        <div className="relative">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => {
                                const textContent = React.Children.toArray(children).join('');
                                if (containsArabic(textContent)) {
                                  return (
                                    <p
                                      className="text-[19px] sm:text-[22px] leading-[2.3] text-right py-4 px-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl my-4 text-slate-900 font-arabic shadow-2xs"
                                      style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}
                                    >
                                      {children}
                                    </p>
                                  );
                                }
                                return <p className="mb-4 text-slate-700 leading-[1.85] tracking-[0.01em]">{children}</p>;
                              },
                              strong: ({ ...props }) => <strong {...props} className="font-extrabold text-slate-900" />,
                              ul: ({ ...props }) => <ul {...props} className="list-disc pl-5 mb-4 space-y-2 text-slate-700 leading-[1.8]" />,
                              ol: ({ ...props }) => <ol {...props} className="list-decimal pl-5 mb-4 space-y-2 text-slate-700 leading-[1.8]" />,
                              li: ({ ...props }) => <li {...props} className="leading-[1.8]" />,
                              h1: ({ ...props }) => <h1 {...props} className="text-base sm:text-lg font-extrabold mb-2.5 mt-5 text-slate-900" />,
                              h2: ({ ...props }) => <h2 {...props} className="text-sm sm:text-base font-bold mb-2 mt-4 text-slate-900" />,
                              h3: ({ ...props }) => <h3 {...props} className="text-sm font-bold mb-1.5 mt-3 text-slate-800" />,
                              blockquote: ({ ...props }) => (
                                <blockquote
                                  {...props}
                                  className="border-l-4 border-emerald-500 pl-4 py-1 my-3.5 bg-slate-50/70 rounded-r-xl italic text-slate-700"
                                />
                              ),
                            }}
                          >
                            {typingMessageIndex === i
                              ? msg.content.slice(0, typingCharCount) + ' ▍'
                              : msg.content}
                          </ReactMarkdown>

                          {/* Tombol Tampilkan Seketika saat efek mengetik sedang berjalan */}
                          {typingMessageIndex === i && (
                            <div className="flex items-center justify-between gap-2 mt-2 py-1.5 px-3 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-800">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                                <span>Mengetik penjelasan dalil...</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setTypingMessageIndex(null)}
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                              >
                                <FastForward className="w-3.5 h-3.5" />
                                <span>Tampilkan Seketika</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Rujukan Brosur & Hadits Terkait (10–20 Rujukan Terverifikasi) */}
                        {msg.debug?.retrieved_docs && msg.debug.retrieved_docs.length > 0 && (
                          <details className="mt-4 border border-emerald-200/80 rounded-2xl p-3.5 text-xs bg-emerald-50/30 font-sans shadow-2xs group">
                            <summary className="cursor-pointer text-slate-800 font-bold select-none flex items-center justify-between gap-2 hover:text-emerald-800">
                              <div className="flex items-center gap-2">
                                <BookOpen size={15} className="text-emerald-600 shrink-0" />
                                <span>
                                  Rujukan Dalil & Brosur Ahad Pagi ({msg.debug.retrieved_docs.length} Rujukan Terverifikasi)
                                </span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                                10–20 Rujukan Arsip
                              </span>
                            </summary>
                            <div className="mt-3 pt-3 border-t border-emerald-200/60">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {msg.debug.retrieved_docs.map((d: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2.5 p-2 rounded-xl bg-white/90 border border-slate-200/70 text-[11.5px] leading-snug"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-800 truncate" title={d.judul}>
                                        {d.judul}
                                      </p>
                                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                                        {d.tahun ? `Arsip Tahun ${d.tahun}` : 'Arsip Pustaka MTA'}
                                        {d.source ? ` • ${d.source}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
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

              {/* Agentic Thinking Steps saat AI Sedang Bekerja (Persis seperti Gambar Referensi) */}
              {isSimulating !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pl-2 sm:pl-4 py-2 space-y-2.5 text-[13.5px] sm:text-[14.5px]"
                >
                  {liveThinkingSteps.slice(0, thinkingStage + 1).map((stepText, idx) => {
                    const isCurrentActive = idx === thinkingStage;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-start gap-2.5 leading-relaxed"
                      >
                        {isCurrentActive ? (
                          <span className="mt-2 w-2 h-2 rounded-full bg-slate-700 animate-pulse shrink-0" />
                        ) : (
                          <span className="text-slate-500 font-semibold select-none shrink-0">✓</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <span
                            className={
                              isCurrentActive
                                ? 'font-semibold text-slate-900'
                                : 'text-slate-500 font-normal'
                            }
                          >
                            {stepText}
                          </span>
                          {isCurrentActive && (
                            <span className="text-slate-400 text-xs sm:text-[13px] font-normal ml-1.5">
                              · {elapsedSeconds} dtk · Langkah {idx + 1} dari maks 10
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* Anchor untuk auto-scroll ke dasar chat */}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Input Bar Fixed di Bawah dengan Padding Bawah Profesional & Nyaman */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-6 sm:pb-7 px-4 sm:px-6 z-20">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!simInput.trim() || isSimulating !== 'idle') return;

                  const userMsg = simInput.trim();
                  setSimInput('');
                  setTypingMessageIndex(null);

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
                className="bg-slate-100/95 border border-slate-200/90 rounded-2xl p-2 flex items-center gap-2.5 focus-within:ring-4 focus-within:ring-emerald-500/15 focus-within:border-emerald-500 focus-within:bg-white transition-all shadow-md"
              >
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Tanyakan materi, dalil aqiqah, shalat, atau materi Brosur Ahad Pagi..."
                  className="flex-1 bg-transparent border-none px-3.5 py-2.5 text-sm sm:text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  disabled={isSimulating !== 'idle'}
                />
                <button
                  type="submit"
                  disabled={!simInput.trim() || isSimulating !== 'idle'}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition cursor-pointer shadow-sm"
                  title={isSimulating !== 'idle' ? "AI sedang bekerja..." : "Kirim Pertanyaan"}
                >
                  {isSimulating !== 'idle' ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-2.5 font-medium">
                <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                <span>Menelusuri 10–20 rujukan arsip Brosur & Hadits MTA (1995–2026) • Tersimpan privat di perangkat Anda</span>
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
