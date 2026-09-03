'use client';

import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/utils/supabase/client';

export default function AiSimulatorPage() {
  type ChatSession = {
    id: string;
    title: string;
    messages: { role: string; content: string }[];
    updatedAt: Date;
  };

  const defaultGreeting = { role: 'assistant', content: 'Halo! Saya Asisten AI Pustaka Brosur Ahad Pagi. Ada yang bisa saya bantu terkait materi brosur?' };

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [simInput, setSimInput] = useState('');
  const [wordCount, setWordCount] = useState('100');
  const [isSimulating, setIsSimulating] = useState<'idle' | 'searching' | 'generating'>('idle');
  const [initError, setInitError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ai_simulator_sessions')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (data && data.length > 0) {
      setSessions(data.map(d => ({
        id: d.id,
        title: d.title,
        messages: d.messages,
        updatedAt: new Date(d.updated_at)
      })));
      setActiveSessionId(data[0].id);
    } else {
      await handleNewSession();
    }
    setIsLoading(false);
  };

  const containsArabic = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  const handleNewSession = async () => {
    const newSession = {
      title: 'Percakapan Baru',
      messages: [defaultGreeting],
    };
    
    const { data, error } = await supabase
      .from('ai_simulator_sessions')
      .insert([newSession])
      .select()
      .single();
      
    if (error) {
      console.log('Gagal membuat sesi baru:', error);
      setInitError(`Gagal menyimpan data ke database. Error: ${error.message || JSON.stringify(error)}. Jika error berkaitan dengan RLS, mohon jalankan perintah "ALTER TABLE ai_simulator_sessions DISABLE ROW LEVEL SECURITY;" di Supabase Anda.`);
      return;
    }
      
    if (data) {
      const mappedSession = {
        id: data.id,
        title: data.title,
        messages: data.messages,
        updatedAt: new Date(data.updated_at)
      };
      setSessions(prev => [mappedSession, ...prev]);
      setActiveSessionId(data.id);
      setInitError(null);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sesi percakapan ini secara permanen?')) return;
    
    await supabase.from('ai_simulator_sessions').delete().eq('id', id);
    const newSessions = sessions.filter(s => s.id !== id);
    
    if (newSessions.length === 0) {
      handleNewSession();
    } else {
      setSessions(newSessions);
      if (activeSessionId === id) {
        setActiveSessionId(newSessions[0].id);
      }
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  if (isLoading) {
    return <div className="p-8 max-w-6xl mx-auto">Memuat riwayat simulasi...</div>;
  }
  
  if (!activeSession) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-4">
          <h3 className="font-bold mb-2">Terjadi Kesalahan</h3>
          <p>{initError || 'Menyiapkan sesi tertunda...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
        <Bot size={24} className="text-accent" />
        Simulator AI
      </h1>
      
      <p className="text-sm text-zinc-500 mb-8">
        Uji coba respons asisten AI Anda menggunakan pengaturan yang sedang berjalan saat ini.
      </p>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
          {/* Sidebar (Riwayat Obrolan) */}
          <div className="w-full lg:w-1/3 border-r-0 lg:border-r border-zinc-200 dark:border-zinc-800 pr-0 lg:pr-6 flex flex-col h-48 lg:h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Bot size={20} className="text-accent" />
                Sesi Chat
              </h2>
            </div>
            
            <button
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors py-2.5 rounded-xl font-semibold mb-4 text-sm"
            >
              <Plus size={16} />
              Percakapan Baru
            </button>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-colors ${activeSessionId === s.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={16} className={activeSessionId === s.id ? 'text-accent' : 'text-zinc-400'} />
                    <div className="truncate">
                      <p className={`text-sm font-medium truncate ${activeSessionId === s.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{s.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{s.messages[s.messages.length - 1]?.content}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                    className="text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                    title="Hapus percakapan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="w-full lg:w-2/3 flex flex-col bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSession.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white rounded-tr-sm rounded-l-2xl rounded-br-2xl text-sm' 
                      : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-tl-sm rounded-r-2xl rounded-bl-2xl text-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="text-[13px] leading-[1.6] space-y-2 markdown-content" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, children, ...props }) => {
                              const textContent = React.Children.toArray(children).join('');
                              if (containsArabic(textContent)) {
                                return (
                                  <p 
                                    {...props} 
                                    className="text-[18px] leading-[1.8] text-right py-2 px-3 bg-white dark:bg-zinc-800/80 rounded-xl my-2 text-zinc-900 dark:text-white"
                                    style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}
                                  >
                                    {children}
                                  </p>
                                );
                              }
                              return <p {...props} className="mb-2 break-words">{children}</p>;
                            },
                            strong: ({ node, ...props }) => <strong {...props} className="font-bold text-zinc-900 dark:text-zinc-100" />,
                            ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2 space-y-1" />,
                            ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1" />,
                            li: ({ node, ...props }) => <li {...props} className="leading-[1.6]" />,
                            h1: ({ node, ...props }) => <h1 {...props} className="text-lg font-bold mb-2 mt-4" />,
                            h2: ({ node, ...props }) => <h2 {...props} className="text-md font-bold mb-2 mt-4" />,
                            h3: ({ node, ...props }) => <h3 {...props} className="text-sm font-bold mb-2 mt-3" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isSimulating !== 'idle' && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-3 shadow-sm rounded-tl-sm flex items-center gap-2 text-zinc-500">
                    <div className="animate-spin text-accent border-2 border-current border-t-transparent rounded-full w-4 h-4"></div>
                    <span className="text-xs font-medium">Memproses...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!simInput.trim() || isSimulating !== 'idle') return;
                  
                  const userMsg = simInput.trim();
                  setSimInput('');
                  
                  const newMessages = [...activeSession.messages, { role: 'user', content: userMsg }];
                  
                  let updatedTitle = activeSession.title;
                  if (activeSession.messages.length === 1) {
                    updatedTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
                  }

                  setSessions(prev => prev.map(s => 
                    s.id === activeSession.id 
                      ? { ...s, title: updatedTitle, messages: newMessages, updatedAt: new Date() } 
                      : s
                  ));
                  
                  await supabase.from('ai_simulator_sessions').update({
                    title: updatedTitle,
                    messages: newMessages,
                    updated_at: new Date().toISOString()
                  }).eq('id', activeSession.id);
                  
                  try {
                    setIsSimulating('generating');
                    
                    const res = await fetch('/api/ai/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ messages: newMessages, wordCount: parseInt(wordCount) }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
                    
                    const finalMessages = [...newMessages, { role: 'assistant', content: data.text }];
                    setSessions(prev => prev.map(s => 
                      s.id === activeSession.id 
                        ? { ...s, messages: finalMessages, updatedAt: new Date() } 
                        : s
                    ));
                    
                    await supabase.from('ai_simulator_sessions').update({
                      messages: finalMessages,
                      updated_at: new Date().toISOString()
                    }).eq('id', activeSession.id);

                  } catch (err: any) {
                    const finalMessages = [...newMessages, { role: 'assistant', content: `Error: ${err.message}` }];
                    setSessions(prev => prev.map(s => 
                      s.id === activeSession.id 
                        ? { ...s, messages: finalMessages, updatedAt: new Date() } 
                        : s
                    ));
                    
                    await supabase.from('ai_simulator_sessions').update({
                      messages: finalMessages,
                      updated_at: new Date().toISOString()
                    }).eq('id', activeSession.id);
                  } finally {
                    setIsSimulating('idle');
                  }
                }}
                className="flex gap-2"
              >
                <select 
                  value={wordCount}
                  onChange={(e) => setWordCount(e.target.value)}
                  className="bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent w-28 flex-shrink-0"
                >
                  <option value="100">100 Kata</option>
                  <option value="500">500 Kata</option>
                  <option value="1000">1000 Kata</option>
                  <option value="2000">2000 Kata</option>
                </select>
                <input 
                  type="text" 
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Ketik pertanyaan untuk simulasi..."
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent min-w-[200px]"
                />
                <button 
                  type="submit"
                  disabled={!simInput.trim() || isSimulating !== 'idle'}
                  className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-accent/90"
                >
                  Kirim
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
