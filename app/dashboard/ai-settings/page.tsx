'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bot, Save, Key, Power } from 'lucide-react';

export default function AiSettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [openrouterToken, setOpenrouterToken] = useState('');
  const [chatModel, setChatModel] = useState('openai/gpt-3.5-turbo');
  const [materialModel, setMaterialModel] = useState('google/gemini-pro');
  const [systemPrompt, setSystemPrompt] = useState('Setiap jawaban hilangkan markdown seperti **, *, ##, dan #. Gunakan kapital besar untuk judul. Sertakan sumber materi/brosur MTA di bagian bawah jawaban.');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

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
            <input 
              type="password" 
              value={openrouterToken}
              onChange={(e) => setOpenrouterToken(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-mono"
            />
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
              <input 
                type="text" 
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                placeholder="openai/gpt-3.5-turbo"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
              <p className="text-xs text-zinc-500 mt-2">Contoh: openai/gpt-3.5-turbo</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Model AI: Buat Materi Kajian
              </label>
              <input 
                type="text" 
                value={materialModel}
                onChange={(e) => setMaterialModel(e.target.value)}
                placeholder="google/gemini-pro"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
              <p className="text-xs text-zinc-500 mt-2">Contoh: google/gemini-pro</p>
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
    </div>
  );
}
