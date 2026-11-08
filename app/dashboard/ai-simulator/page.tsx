'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, MessageSquare, Plus, Trash2, Brain, Database, 
  RefreshCw, Send, Sparkles, ExternalLink, ShieldAlert, X, Copy, Check 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/utils/supabase/client';

type ChatSession = {
  id: string;
  title: string;
  messages: { role: string; content: string; debug?: any }[];
  updatedAt: Date;
};

const LOCAL_STORAGE_KEY = 'ai_simulator_saved_sessions';

export default function AiSimulatorPage() {
  const defaultGreeting = { 
    role: 'assistant', 
    content: 'Assalamu’alaikum! Saya Asisten AI **Sahabat MTA**. Silakan ajukan pertanyaan seputar fiqih, dalil hadits, dan materi Brosur Ahad Pagi MTA.' 
  };

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [simInput, setSimInput] = useState('');
  const [isSimulating, setIsSimulating] = useState<'idle' | 'searching' | 'generating'>('idle');
  const [hasRlsWarning, setHasRlsWarning] = useState<boolean>(false);
  const [isSqlCopied, setIsSqlCopied] = useState<boolean>(false);

  const supabase = createClient();

  useEffect(() => {
    fetchSessions();
  }, []);

  const containsArabic = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  // Helper untuk membaca dari LocalStorage
  const getLocalSessions = (): ChatSession[] => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            updatedAt: new Date(s.updatedAt || Date.now())
          }));
        }
      }
    } catch {}
    return [];
  };

  // Helper untuk menyimpan ke LocalStorage
  const persistLocalSessions = (updatedSessions: ChatSession[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch {}
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    let loadedSessions: ChatSession[] = [];
    let rlsBlocked = false;

    try {
      // Coba ambil dari Supabase
      const { data, error } = await supabase
        .from('ai_simulator_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Supabase fetch failed (kemungkinan RLS):', error.message);
        rlsBlocked = true;
      } else if (data && data.length > 0) {
        loadedSessions = data.map(d => ({
          id: d.id,
          title: d.title || 'Percakapan Tanpa Judul',
          messages: Array.isArray(d.messages) ? d.messages : [defaultGreeting],
          updatedAt: new Date(d.updated_at || d.created_at || Date.now())
        }));
      }
    } catch (e) {
      console.warn('Network / client fetch error:', e);
      rlsBlocked = true;
    }

    // Jika Supabase kosong atau terhalang RLS, ambil cadangan lokal
    if (loadedSessions.length === 0) {
      const local = getLocalSessions();
      if (local.length > 0) {
        loadedSessions = local;
      }
    }

    // Jika masih kosong sama sekali, buat sesi default baru
    if (loadedSessions.length === 0) {
      const initialSession: ChatSession = {
        id: 'session-' + Date.now(),
        title: 'Percakapan Baru',
        messages: [defaultGreeting],
        updatedAt: new Date()
      };
      loadedSessions = [initialSession];

      // Coba simpan ke Supabase di background
      supabase
        .from('ai_simulator_sessions')
        .insert([{ title: initialSession.title, messages: initialSession.messages }])
        .select()
        .single()
        .then(({ data: created, error: createErr }) => {
          if (created) {
            setSessions(prev => prev.map(s => s.id === initialSession.id ? { ...s, id: created.id } : s));
            setActiveSessionId(created.id);
          } else if (createErr) {
            setHasRlsWarning(true);
          }
        });
    }

    if (rlsBlocked) {
      setHasRlsWarning(true);
    }

    setSessions(loadedSessions);
    setActiveSessionId(loadedSessions[0].id);
    persistLocalSessions(loadedSessions);
    setIsLoading(false);
  };

  const handleNewSession = async () => {
    const tempId = 'session-' + Date.now();
    const newSession: ChatSession = {
      id: tempId,
      title: 'Percakapan Baru',
      messages: [defaultGreeting],
      updatedAt: new Date(),
    };

    // Langsung update state lokal agar UI instan dan tidak macet
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(tempId);
    persistLocalSessions(updated);

    // Coba simpan ke Supabase
    try {
      const { data, error } = await supabase
        .from('ai_simulator_sessions')
        .insert([{ title: newSession.title, messages: newSession.messages }])
        .select()
        .single();

      if (data) {
        // Update ID lokal dengan ID UUID dari Supabase
        setSessions(prev => {
          const next = prev.map(s => s.id === tempId ? { ...s, id: data.id } : s);
          persistLocalSessions(next);
          return next;
        });
        setActiveSessionId(data.id);
      } else if (error) {
        console.warn('Gagal menyimpan sesi baru ke Supabase (RLS):', error.message);
        setHasRlsWarning(true);
      }
    } catch (err: any) {
      console.warn('Supabase insert exception:', err.message);
      setHasRlsWarning(true);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('Hapus sesi percakapan simulasi ini?')) return;
    
    const nextSessions = sessions.filter(s => s.id !== id);
    setSessions(nextSessions);
    persistLocalSessions(nextSessions);

    if (activeSessionId === id && nextSessions.length > 0) {
      setActiveSessionId(nextSessions[0].id);
    } else if (nextSessions.length === 0) {
      handleNewSession();
    }

    // Hapus juga di Supabase jika ID bukan sesi lokal sementara
    if (!id.startsWith('session-')) {
      await supabase.from('ai_simulator_sessions').delete().eq('id', id);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'fallback-session',
    title: 'Percakapan Baru',
    messages: [defaultGreeting],
    updatedAt: new Date()
  };

  const copyRlsSql = () => {
    navigator.clipboard.writeText('ALTER TABLE ai_simulator_sessions DISABLE ROW LEVEL SECURITY;');
    setIsSqlCopied(true);
    setTimeout(() => setIsSqlCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-xs font-semibold">Menyiapkan AI Playground...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-68px)] bg-white overflow-hidden relative font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />

      {/* LEFT SIDEBAR (Riwayat Simulasi) */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-100">
          <button
            type="button"
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={15} /> Percakapan Baru
          </button>
        </div>
        
        {/* List Sesi */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Riwayat Uji Coba ({sessions.length})
          </div>
          {sessions.map(s => (
            <div 
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`p-2 rounded-xl cursor-pointer flex justify-between items-center group transition text-xs select-none ${
                activeSessionId === s.id 
                  ? 'bg-white text-emerald-950 font-bold border border-emerald-200 shadow-xs' 
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <div className="truncate flex-1 min-w-0 pr-1">{s.title}</div>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition p-1"
                title="Hapus Sesi"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        
        {/* Footer Quick Links */}
        <div className="p-3 border-t border-slate-200 bg-white space-y-1.5">
          <a 
            href="/dashboard/ai-settings?tab=rules"
            className="w-full flex items-center justify-between p-2 rounded-lg transition text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 text-xs font-semibold"
          >
            <span className="flex items-center gap-2">
              <Brain size={14} className="text-emerald-600" /> Aturan Fiqih (Settings)
            </span>
            <ExternalLink size={12} className="text-slate-400" />
          </a>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-white min-w-0">
        
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
          <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Bot size={18} className="text-emerald-600" />
            <span className="truncate">{activeSession.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live RAG Simulator
            </span>
          </div>
        </div>

        {/* NOTIFIKASI RLS SUPABASE JIKA RLS AKTIF DI CLOUD */}
        {hasRlsWarning && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-900 shadow-xs shrink-0">
            <div className="flex items-start gap-2.5 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="font-bold text-amber-950">Info Sinkronisasi Cloud (Supabase RLS):</p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                  Sesi percakapan Anda saat ini tetap <strong>tersimpan aman di memori browser lokal</strong>. Agar percakapan tersinkronisasi otomatis ke cloud Supabase, jalankan perintah ini di Supabase SQL Editor:
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <code className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg font-mono text-[11px] text-amber-950 font-bold select-all truncate">
                    ALTER TABLE ai_simulator_sessions DISABLE ROW LEVEL SECURITY;
                  </code>
                  <button
                    type="button"
                    onClick={copyRlsSql}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {isSqlCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{isSqlCopied ? 'Tersalin' : 'Salin SQL'}</span>
                  </button>
                </div>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setHasRlsWarning(false)} 
              className="text-amber-500 hover:text-amber-800 p-1 rounded-md transition"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-36">
          <div className="max-w-3xl mx-auto space-y-6">
            {activeSession.messages.map((msg, i) => (
              <div key={i} className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role !== 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Bot size={15} />
                  </div>
                )}

                <div className={`max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-2xl py-2.5 px-4 text-xs font-medium shadow-xs' 
                    : 'text-slate-800 py-1 flex-1 min-w-0'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="text-xs leading-relaxed space-y-2">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => {
                            const textContent = React.Children.toArray(children).join('');
                            if (containsArabic(textContent)) {
                              return (
                                <p className="text-[17px] leading-[2] text-right py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl my-2 text-slate-900 font-arabic" style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}>
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
                          h1: ({ ...props }) => <h1 {...props} className="text-sm font-extrabold mb-1 mt-3 text-slate-900" />,
                          h2: ({ ...props }) => <h2 {...props} className="text-xs font-bold mb-1 mt-2 text-slate-900" />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* Debug Log RAG */}
                      {msg.debug && (
                        <details className="mt-3 border border-slate-200 rounded-xl p-2.5 text-[11px] bg-slate-50 font-mono">
                          <summary className="cursor-pointer text-slate-500 font-bold select-none flex items-center gap-1.5 hover:text-slate-800">
                            <Database size={13} className="text-emerald-600" />
                            Log Sistem RAG & Dokumen Terkait
                          </summary>
                          <div className="mt-2.5 space-y-1 text-slate-600 pt-2 border-t border-slate-200/80">
                            {msg.debug.extracted_keyword && (
                              <p><span className="font-bold text-slate-800">Kata Kunci:</span> {msg.debug.extracted_keyword}</p>
                            )}
                            {msg.debug.system_prompt_length && (
                              <p><span className="font-bold text-slate-800">Prompt:</span> {msg.debug.system_prompt_length} karakter</p>
                            )}
                            {msg.debug.retrieved_docs && (
                              <div>
                                <span className="font-bold text-slate-800">Brosur Ditemukan ({msg.debug.retrieved_docs.length}):</span>
                                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                  {msg.debug.retrieved_docs.map((d: any, idx: number) => (
                                    <li key={idx}>{d.judul} ({d.tahun})</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSimulating !== 'idle' && (
              <div className="flex gap-3 items-center text-xs text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <span>Sahabat MTA sedang mencari dalil dan menyusun jawaban...</span>
              </div>
            )}
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

                // 1. Update State Lokal & LocalStorage Seketika (Tanpa Tunggu Jaringan)
                const nextSessions = sessions.map(s => 
                  s.id === activeSession.id 
                    ? { ...s, title: updatedTitle, messages: newMessages, updatedAt: new Date() } 
                    : s
                );
                setSessions(nextSessions);
                persistLocalSessions(nextSessions);
                
                // 2. Simpan pesan user ke Supabase (jika bisa)
                if (!activeSession.id.startsWith('session-')) {
                  supabase
                    .from('ai_simulator_sessions')
                    .update({ title: updatedTitle, messages: newMessages })
                    .eq('id', activeSession.id)
                    .then(({ error: saveErr }) => {
                      if (saveErr) setHasRlsWarning(true);
                    });
                }
                
                try {
                  setIsSimulating('generating');
                  const res = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: newMessages, wordCount: 500 }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan sistem');
                  
                  const finalMessages = [...newMessages, { role: 'assistant', content: data.text, debug: data.debug_log }];
                  
                  const finalizedSessions = sessions.map(s => 
                    s.id === activeSession.id 
                      ? { ...s, title: updatedTitle, messages: finalMessages, updatedAt: new Date() } 
                      : s
                  );
                  setSessions(finalizedSessions);
                  persistLocalSessions(finalizedSessions);
                  
                  // Simpan balasan AI ke Supabase
                  if (!activeSession.id.startsWith('session-')) {
                    supabase
                      .from('ai_simulator_sessions')
                      .update({ messages: finalMessages })
                      .eq('id', activeSession.id)
                      .then(({ error: saveAiErr }) => {
                        if (saveAiErr) setHasRlsWarning(true);
                      });
                  }
                } catch (err: any) {
                  const finalMessages = [...newMessages, { role: 'assistant', content: `Mohon maaf, terjadi kendala: ${err.message}`, debug: { error: err.message } }];
                  const errorSessions = sessions.map(s => 
                    s.id === activeSession.id 
                      ? { ...s, messages: finalMessages, updatedAt: new Date() } 
                      : s
                  );
                  setSessions(errorSessions);
                  persistLocalSessions(errorSessions);
                } finally {
                  setIsSimulating('idle');
                }
              }}
              className="bg-slate-100 border border-slate-200 rounded-2xl p-1.5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 focus-within:bg-white transition"
            >
              <input 
                type="text"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="Tanyakan fatwa, topik, atau dalil ke Sahabat MTA..."
                className="flex-1 bg-transparent border-none px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                disabled={isSimulating !== 'idle'}
              />
              <button 
                type="submit"
                disabled={!simInput.trim() || isSimulating !== 'idle'}
                className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition cursor-pointer"
                title="Kirim Pertanyaan"
              >
                <Send size={14} />
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 mt-1.5">
              Simulasi menggunakan guardrails dan aturan fatwa resmi Brosur Ahad Pagi MTA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
