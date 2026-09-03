'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bot, Save, Key, Power, Search, Copy, Check, MessageSquare, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AiSettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [openrouterToken, setOpenrouterToken] = useState('');
  const [chatModel, setChatModel] = useState('google/gemini-2.5-flash');
  const [materialModel, setMaterialModel] = useState('google/gemini-2.5-flash');
  const [systemPrompt, setSystemPrompt] = useState('Gunakan gaya bahasa santun...');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
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
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Model AI Utama (Otak Sistem)
            </label>
            <select 
              value={chatModel}
              onChange={(e) => {
                setChatModel(e.target.value);
                setMaterialModel(e.target.value);
              }}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm appearance-none"
            >
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Sangat Cepat & Murah, Direkomendasikan)</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini (Cerdas & Ringan)</option>
              <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Klasik)</option>
              <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Gratis tapi Terbatas)</option>
              <option value="deepseek/deepseek-chat">DeepSeek V3 (Sangat Cerdas)</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
            </select>
            <p className="text-xs text-zinc-500 mt-2">
              Pilihan model ini akan digunakan sebagai otak utama untuk menjawab di Chat Simulator maupun fitur lainnya.
            </p>
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
    </div>
  );
}
