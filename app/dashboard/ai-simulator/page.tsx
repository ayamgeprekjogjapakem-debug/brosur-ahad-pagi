'use client';

import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Plus, Trash2, Brain, Save, ToggleLeft, ToggleRight, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/utils/supabase/client';

export default function AiSimulatorPage() {
  type ChatSession = {
    id: string;
    title: string;
    messages: { role: string; content: string; debug?: any }[];
    updatedAt: Date;
  };

  type AiRule = {
    id: string;
    keyword: string;
    instruction: string;
    is_active: boolean;
    created_at: string;
    target_folder_id?: string | null;
  };

  type Folder = {
    id: string;
    name: string;
  };

  const defaultGreeting = { role: 'assistant', content: 'Halo! Saya Asisten AI Pustaka Brosur Ahad Pagi. Ada yang bisa saya bantu terkait materi brosur?' };

  const [activeTab, setActiveTab] = useState<'chat' | 'memory'>('chat');
  
  // States for Chat
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [simInput, setSimInput] = useState('');
  const [wordCount, setWordCount] = useState('100');
  const [isSimulating, setIsSimulating] = useState<'idle' | 'searching' | 'generating'>('idle');
  const [initError, setInitError] = useState<string | null>(null);

  // States for Memory
  const [rules, setRules] = useState<AiRule[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isRulesLoading, setIsRulesLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newTargetFolderId, setNewTargetFolderId] = useState('');
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Check URL for tab
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'memory' || tab === 'chat') {
        setActiveTab(tab);
      }
    }
    fetchSessions();
    fetchRules();
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    const { data } = await supabase.from('folders').select('id, name').order('name', { ascending: false });
    if (data) setFolders(data);
  };

  const changeTab = (tab: 'chat' | 'memory') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?tab=${tab}`);
    }
  };

  const fetchRules = async () => {
    setIsRulesLoading(true);
    const { data, error } = await supabase
      .from('ai_knowledge_rules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setRules(data);
    } else {
      console.error('Failed to fetch rules', error);
    }
    setIsRulesLoading(false);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newInstruction.trim()) return;
    
    setSaveStatus(null);

    const { data, error } = await supabase
      .from('ai_knowledge_rules')
      .insert([{ 
        keyword: newKeyword.trim(), 
        instruction: newInstruction.trim(), 
        is_active: true,
        target_folder_id: newTargetFolderId || null
      }])
      .select();

    if (error) {
      setSaveStatus({ type: 'error', message: 'Gagal menyimpan aturan: ' + error.message });
      return;
    }

    if (data && data.length > 0) {
      setRules(prev => [data[0], ...prev]);
      setNewKeyword('');
      setNewInstruction('');
      setNewTargetFolderId('');
      setSaveStatus({ type: 'success', message: 'Aturan memori berhasil disimpan!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleToggleRule = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('ai_knowledge_rules')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Hapus aturan ini secara permanen?')) return;
    const { error } = await supabase
      .from('ai_knowledge_rules')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setRules(prev => prev.filter(r => r.id !== id));
    }
  };

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
    <div className="fixed inset-0 z-50 flex h-screen w-screen bg-white  font-[family-name:var(--font-geist-sans)] text-sm overflow-hidden">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />
      
      {/* LEFT SIDEBAR (History) */}
      <div className="w-64 bg-zinc-50  border-r border-zinc-200  flex flex-col flex-shrink-0">
        <div className="p-3">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-start gap-2 bg-white  hover:bg-zinc-100  border border-zinc-200  py-2.5 px-3 rounded-lg font-medium transition-colors"
          >
            <Plus size={16} /> Percakapan Baru
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="text-xs font-semibold text-zinc-500 px-2 mb-2 mt-2">Riwayat Simulasi</div>
          {sessions.map(s => (
            <div 
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`p-2 rounded-lg cursor-pointer flex justify-between items-center group transition-colors ${activeSessionId === s.id ? 'bg-zinc-200  text-zinc-900 ' : 'text-zinc-700  hover:bg-zinc-100 '}`}
            >
              <div className="truncate text-[13px] font-medium">{s.title}</div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-1 flex-shrink-0 ml-2"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-3 border-t border-zinc-200  space-y-1">
          <button 
            onClick={() => changeTab('memory')}
            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-[13px] font-medium ${activeTab === 'memory' ? 'bg-zinc-200  text-zinc-900 ' : 'text-zinc-600  hover:bg-zinc-100 '}`}
          >
            <Brain size={16} /> Kelola Memori AI
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-zinc-600  hover:bg-zinc-100  text-[13px] font-medium"
          >
            <ToggleLeft size={16} /> Keluar Simulator
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-white ">
        
        {/* Header */}
        <div className="h-14 flex-shrink-0 border-b border-zinc-200  flex items-center justify-between px-6 z-10 bg-white ">
          <div className="font-semibold text-zinc-800  flex items-center gap-2">
            <Bot size={18} className="text-emerald-600" />
            {activeTab === 'memory' ? 'Memori Khusus AI' : activeSession.title}
          </div>
          {activeTab === 'chat' && (
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Model Aktif
            </div>
          )}
        </div>

        {/* Content Area */}
        {activeTab === 'memory' ? (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-zinc-50  p-6 rounded-2xl border border-zinc-200 ">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Plus size={20} className="text-emerald-600" />
                  Tambah Aturan Baru
                </h2>
                <p className="text-sm text-zinc-500 mb-6">Ajari AI aturan khusus saat menganalisis brosur. AI akan membaca memori ini sebelum menjawab.</p>
                
                <form onSubmit={handleAddRule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Kata Kunci (Opsional / Penanda)</label>
                    <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Misal: aqiqah, puasa, umum..." className="w-full p-3 bg-white  border border-zinc-200  rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Instruksi / Aturan Wajib</label>
                    <textarea value={newInstruction} onChange={e => setNewInstruction(e.target.value)} placeholder="Misal: Jika ada pertanyaan tentang puasa senin kamis, sebutkan bahwa..." className="w-full p-3 h-24 bg-white  border border-zinc-200  rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Sumber Data (Opsional)</label>
                    <select value={newTargetFolderId} onChange={e => setNewTargetFolderId(e.target.value)} className="w-full p-3 bg-white  border border-zinc-200  rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="">Semua Data / Referensi Bebas</option>
                      {folders.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                    </select>
                  </div>
                  <button type="submit" disabled={!newKeyword || !newInstruction} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50">
                    <Save size={18} /> Simpan Aturan
                  </button>
                  {saveStatus && (
                    <div className={`mt-4 p-3 rounded-xl border text-sm font-medium ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{saveStatus.message}</div>
                  )}
                </form>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Daftar Memori AI</h2>
                {isRulesLoading ? (
                  <p className="text-zinc-500">Memuat memori...</p>
                ) : rules.length === 0 ? (
                  <p className="text-zinc-500 italic">Belum ada aturan khusus yang disimpan.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rules.map(rule => (
                      <div key={rule.id} className={`p-5 rounded-2xl border ${rule.is_active ? 'bg-white  border-zinc-200 ' : 'bg-zinc-100  border-zinc-200  opacity-60'} shadow-sm relative group`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                            <span className="inline-block px-3 py-1 bg-emerald-100  text-emerald-700  text-xs font-bold rounded-lg uppercase">{rule.keyword}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleToggleRule(rule.id, rule.is_active)} className="text-zinc-400 hover:text-emerald-600 transition-colors">
                              {rule.is_active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                            </button>
                            <button onClick={() => handleDeleteRule(rule.id)} className="text-zinc-400 hover:text-red-500 transition-colors">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-zinc-800  leading-relaxed mt-3">{rule.instruction}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto pb-40 pt-10">
              <div className="max-w-3xl mx-auto px-6 space-y-8">
                {activeSession.messages.length <= 1 && (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-400 space-y-4">
                     <Bot size={48} className="opacity-20" />
                     <p className="font-medium text-lg text-zinc-500">Ada yang bisa saya bantu hari ini?</p>
                  </div>
                )}
                {activeSession.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role !== 'user' && (
                      <div className="w-8 h-8 rounded-full border border-zinc-200  flex items-center justify-center flex-shrink-0 text-zinc-600 ">
                        <Bot size={16} />
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-zinc-100  rounded-3xl py-3 px-5 text-[15px]' : 'py-1'}`}>
                      {msg.role === 'user' ? (
                         msg.content
                      ) : (
                         <div className="text-[15px] leading-relaxed markdown-content" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                           <ReactMarkdown
                             remarkPlugins={[remarkGfm]}
                             components={{
                               p: ({ node, children, ...props }) => {
                                 const textContent = React.Children.toArray(children).join('');
                                 if (containsArabic(textContent)) {
                                   return (
                                     <p {...props} className="text-[20px] leading-[2.2] text-right py-3 px-4 bg-zinc-50  rounded-xl my-4 text-zinc-900 " style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}>{children}</p>
                                   );
                                 }
                                 return <p {...props} className="mb-4 break-words text-zinc-800 ">{children}</p>;
                               },
                               strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-zinc-950 " />,
                               ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 mb-4 space-y-1 text-zinc-800 " />,
                               ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 mb-4 space-y-1 text-zinc-800 " />,
                               li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
                               h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mb-3 mt-6 text-zinc-900 " />,
                               h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mb-3 mt-6 text-zinc-900 " />,
                               h3: ({ node, ...props }) => <h3 {...props} className="text-base font-bold mb-2 mt-4 text-zinc-900 " />,
                             }}
                           >
                             {msg.content}
                           </ReactMarkdown>
                         </div>
                      )}
                      
                      {msg.debug && (
                         <details className="mt-4 border border-zinc-200  rounded-xl p-3 text-xs bg-zinc-50 ">
                           <summary className="cursor-pointer text-zinc-500 font-semibold select-none flex items-center gap-2">
                             <Database size={14} /> Lihat Log Sistem RAG
                           </summary>
                           <div className="mt-3 space-y-2 text-zinc-600  p-2 font-mono">
                              <p><span className="font-bold">Kata Kunci Diekstrak:</span> {msg.debug.extracted_keyword}</p>
                              <p><span className="font-bold">Prompt Length:</span> {msg.debug.system_prompt_length} chars</p>
                              <p><span className="font-bold">Brosur Ditemukan:</span></p>
                              <ul className="list-disc pl-4 space-y-1">
                                {msg.debug.retrieved_docs?.map((d: any, i: number) => <li key={i}>{d.judul} ({d.tahun})</li>)}
                              </ul>
                           </div>
                         </details>
                      )}
                    </div>
                  </div>
                ))}
                {isSimulating !== 'idle' && (
                  <div className="flex gap-4">
                     <div className="w-8 h-8 rounded-full border border-zinc-200  flex items-center justify-center flex-shrink-0">
                        <div className="w-3 h-3 border-2 border-zinc-600  border-t-transparent rounded-full animate-spin"></div>
                     </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white   to-transparent pt-12 pb-6 px-6">
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
                      updatedTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
                    }

                    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, title: updatedTitle, messages: newMessages, updatedAt: new Date() } : s));
                    await supabase.from('ai_simulator_sessions').update({ title: updatedTitle, messages: newMessages, updated_at: new Date().toISOString() }).eq('id', activeSession.id);
                    
                    try {
                      setIsSimulating('generating');
                      const res = await fetch('/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages: newMessages, wordCount: 500 }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
                      
                      const finalMessages = [...newMessages, { role: 'assistant', content: data.text, debug: data.debug_log }];
                      setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messages: finalMessages, updatedAt: new Date() } : s));
                      await supabase.from('ai_simulator_sessions').update({ messages: finalMessages, updated_at: new Date().toISOString() }).eq('id', activeSession.id);
                    } catch (err: any) {
                      const finalMessages = [...newMessages, { role: 'assistant', content: `Error: ${err.message}`, debug: { error: err.message } }];
                      setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messages: finalMessages, updatedAt: new Date() } : s));
                      await supabase.from('ai_simulator_sessions').update({ messages: finalMessages, updated_at: new Date().toISOString() }).eq('id', activeSession.id);
                    } finally {
                      setIsSimulating('idle');
                    }
                  }}
                  className="bg-zinc-100  rounded-3xl p-2 flex items-end gap-2"
                >
                  <textarea 
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    placeholder="Tanyakan ke Sahabat MTA..."
                    className="flex-1 bg-transparent border-transparent px-4 py-3 text-[15px] text-zinc-900  focus:outline-none resize-none max-h-48 min-h-[52px]"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if(simInput.trim() && isSimulating === 'idle') e.currentTarget.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                      }
                    }}
                  />
                  <button 
                    type="submit"
                    disabled={!simInput.trim() || isSimulating !== 'idle'}
                    className="w-10 h-10 rounded-full bg-zinc-900  text-white  flex items-center justify-center flex-shrink-0 disabled:opacity-30 mb-1 mr-1 transition-transform active:scale-95"
                  >
                    <MessageSquare size={16} />
                  </button>
                </form>
                <div className="text-center mt-3 text-xs text-zinc-400 ">AI bisa berbuat kesalahan. Selalu periksa kembali hukum dan dalil dengan rujukan asli MTA.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
