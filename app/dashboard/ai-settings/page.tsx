'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bot, Save, Key, Power, Search, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AiSettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [openrouterToken, setOpenrouterToken] = useState('');
  const [chatModel, setChatModel] = useState('openai/gpt-3.5-turbo');
  const [materialModel, setMaterialModel] = useState('google/gemini-pro');
  const [systemPrompt, setSystemPrompt] = useState('Gunakan gaya bahasa santun, poin-poin terstruktur, dan huruf tebal untuk menyorot dalil penting.');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Simulator state
  const [simInput, setSimInput] = useState('');
  const [isSimulating, setIsSimulating] = useState<'idle' | 'searching' | 'generating'>('idle');
  const [simMessages, setSimMessages] = useState<{role: string, content: string}[]>([]);
  const [currentContext, setCurrentContext] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'brosur' | 'umum'>('brosur');
  
  const supabase = createClient();
  
  const containsArabic = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  const renderFormattedText = (text: string) => {
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('ai_enabled, openrouter_token, chat_model, material_model, system_prompt')
      .eq('id', 1)
      .single();
    
    if (data) {
      setAiEnabled(data.ai_enabled || false);
      setOpenrouterToken(data.openrouter_token || '');
      if (data.chat_model) setChatModel(data.chat_model);
      if (data.material_model) setMaterialModel(data.material_model);
      if (data.system_prompt) setSystemPrompt(data.system_prompt);
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { error } = await supabase
      .from('app_settings')
      .update({
        ai_enabled: aiEnabled,
        openrouter_token: openrouterToken,
        chat_model: chatModel,
        material_model: materialModel,
        system_prompt: systemPrompt,
      })
      .eq('id', 1);
      
    if (error) {
      alert(`Gagal menyimpan pengaturan: ${error.message}`);
    } else {
      alert('Pengaturan AI berhasil disimpan!');
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8">Memuat pengaturan AI...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
        <Bot size={24} className="text-accent" />
        Pengaturan AI (OpenRouter)
      </h1>
      
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-sm text-zinc-500 mb-8">
          Konfigurasi asisten AI untuk menjawab pertanyaan seputar Al-Quran dan Brosur MTA di dalam aplikasi Pustaka.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Toggle AI */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Power size={18} className={aiEnabled ? "text-emerald-500" : "text-zinc-400"} />
                Status Fitur AI
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Tampilkan tombol Asisten AI di dashboard aplikasi Pustaka.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={aiEnabled}
                onChange={() => setAiEnabled(!aiEnabled)}
              />
              <div className="w-14 h-7 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* OpenRouter Token */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
              <Key size={16} /> API Key OpenRouter
            </label>
            <div className="relative flex items-center">
              <input 
                type="password" 
                value={openrouterToken}
                onChange={(e) => setOpenrouterToken(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-mono"
              />
              <button 
                type="button"
                onClick={() => {
                  if (!openrouterToken) return;
                  navigator.clipboard.writeText(openrouterToken);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="absolute right-2 p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                title="Salin API Key"
              >
                {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Dapatkan API Key dari <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-accent hover:underline">OpenRouter</a>. AI ini disetel untuk menggunakan model yang gratis/optimal.
            </p>
          </div>

          {/* Model AI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Model AI: Tanya Singkat
              </label>
              <select 
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm appearance-none"
              >
                <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Cepat & Murah)</option>
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Sangat Cepat & Murah)</option>
                <option value="google/gemini-pro">Gemini Pro</option>
                <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Gratis)</option>
                <option value="deepseek/deepseek-chat">DeepSeek V3 (Sangat Cerdas)</option>
                <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
              </select>
              <p className="text-xs text-zinc-500 mt-2">Model yang digunakan untuk fitur chat di pojok kanan bawah.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Model AI: Buat Materi Kajian
              </label>
              <select 
                value={materialModel}
                onChange={(e) => setMaterialModel(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm appearance-none"
              >
                <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Cepat & Murah)</option>
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Sangat Cepat & Murah)</option>
                <option value="google/gemini-pro">Gemini Pro</option>
                <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Gratis)</option>
                <option value="deepseek/deepseek-chat">DeepSeek V3 (Sangat Cerdas)</option>
                <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
              </select>
              <p className="text-xs text-zinc-500 mt-2">Model yang digunakan untuk halaman Generator AI Kajian.</p>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Aturan Dasar AI (System Prompt)
            </label>
            <textarea 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="Instruksi untuk AI..."
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Instruksi ini akan dikirimkan secara otomatis di latar belakang untuk mengatur gaya bicara AI (misal: hilangkan markdown, gunakan kapital untuk judul, wajib sertakan sumber brosur).
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex justify-center items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
            >
              <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>

      {/* Simulator Section */}
      <div className="mt-8 bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Bot size={20} className="text-accent" />
            Simulator Tanya Singkat (Chat AI)
          </h2>
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value as 'brosur' | 'umum')}
            className="text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 outline-none text-zinc-800 dark:text-zinc-200"
          >
            <option value="brosur">Mode: Khusus Brosur MTA</option>
            <option value="umum">Mode: Pengetahuan Bebas</option>
          </select>
        </div>
        <p className="text-sm text-zinc-500 mb-6">
          Uji coba respons AI dengan pengaturan yang sedang berjalan. (Pastikan Anda sudah menyimpan pengaturan terlebih dahulu).
        </p>
        
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-950/50">
          <div className="p-4 h-[400px] overflow-y-auto space-y-4">
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-2xl rounded-tl-sm p-3 max-w-[85%] text-sm">
                Halo! Saya adalah asisten AI Pustaka Brosur Ahad Pagi. Silakan coba tanyakan sesuatu untuk menguji pengaturan Anda.
              </div>
            </div>
            
            {simMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-accent text-white rounded-tr-sm text-sm' 
                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-tl-sm text-sm'
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
                  {isSimulating === 'searching' ? (
                    <>
                      <Search size={16} className="animate-pulse text-blue-500" />
                      <span className="text-xs font-medium">Mencari brosur...</span>
                    </>
                  ) : (
                    <>
                      <div className="animate-spin text-accent border-2 border-current border-t-transparent rounded-full w-4 h-4"></div>
                      <span className="text-xs font-medium">Memproses...</span>
                    </>
                  )}
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
                const newMessages = [...simMessages, { role: 'user', content: userMsg }];
                setSimMessages(newMessages as any);
                
                try {
                  setIsSimulating('searching');
                  
                  const cleanWords = userMsg
                    .toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(w => w.length > 2 && !['apa', 'apakah', 'bagaimana', 'kenapa', 'mengapa', 'siapa', 'kapan', 'dimana', 'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'ini', 'itu', 'dalil', 'hukum', 'tentang', 'hadis', 'hadist', 'ayat', 'bacaan', 'buatkan', 'tuliskan', 'jelaskan', 'sebutkan', 'uraikan', 'berikan', 'materi', 'ceramah', 'khutbah', 'kultum', 'dalam', 'kata', 'paragraf', 'tolong', 'bantu', 'saya', 'lain', 'lagi', 'terus', 'dong', 'coba', 'contoh', 'tambah', 'tambahan'].includes(w));
                  
                  let contextText = currentContext;
                  
                  if (searchMode === 'brosur') {
                    if (cleanWords.length > 0) {
                      const searchQuery = cleanWords.join(' ');
                      
                      const { data: searchResults, error: searchError } = await supabase.rpc('search_brosur_ranked', {
                        search_query: searchQuery,
                        filter_folder_id: null
                      });
                      
                      if (!searchError && searchResults && searchResults.length > 0) {
                        contextText = searchResults.slice(0, 3).map((b: any) => {
                          const text = b.teks_bersih || b.konten?.replace(/<[^>]+>/g, '') || '';
                          return `Judul: ${b.judul}\nTahun: ${b.tahun}\nIsi:\n${text.substring(0, 5000)}`;
                        }).join('\n\n---\n\n');
                        setCurrentContext(contextText);
                      }
                    }
                  }
                  
                  if (searchMode === 'brosur' && !contextText) {
                    setSimMessages([...newMessages, { role: 'assistant', content: 'Maaf, saya tidak menemukan referensi yang relevan di arsip Brosur Ahad Pagi.' }] as any);
                    setIsSimulating('idle');
                    return;
                  }
                  
                  setIsSimulating('generating');
                  
                  const res = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: newMessages, contextText, mode: searchMode }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
                  setSimMessages([...newMessages, { role: 'assistant', content: data.text }] as any);
                } catch (err: any) {
                  setSimMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }] as any);
                } finally {
                  setIsSimulating('idle');
                }
              }}
              className="flex gap-2"
            >
              <input 
                type="text" 
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="Ketik pertanyaan untuk simulasi..."
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
  );
}
