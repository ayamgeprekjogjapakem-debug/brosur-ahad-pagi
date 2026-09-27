'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bot, Save, Key, Power, Search, Copy, Check, MessageSquare, Plus, Trash2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AiSettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [openrouterToken, setOpenrouterToken] = useState('');
  const [googleAiToken, setGoogleAiToken] = useState('');
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
      .select('ai_enabled, openrouter_token, google_ai_token, chat_model, material_model, system_prompt')
      .eq('id', 1)
      .single();
    
    if (data) {
      setAiEnabled(data.ai_enabled || false);
      setOpenrouterToken(data.openrouter_token || '');
      setGoogleAiToken(data.google_ai_token || '');
      if (data.chat_model) setChatModel(data.chat_model);
      if (data.material_model) setMaterialModel(data.material_model);
      if (data.system_prompt) setSystemPrompt(data.system_prompt);
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Check if column google_ai_token exists, if it errors, we inform the user to run SQL
    const updatePayload: any = {
      ai_enabled: aiEnabled,
      openrouter_token: openrouterToken,
      google_ai_token: googleAiToken,
      chat_model: chatModel,
      material_model: materialModel,
      system_prompt: systemPrompt,
    };

    const { error } = await supabase
      .from('app_settings')
      .update(updatePayload)
      .eq('id', 1);
      
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('google_ai_token')) {
         alert('Gagal! Sepertinya tabel database perlu diupdate. Jalankan SQL ini di Supabase:\n\nALTER TABLE app_settings ADD COLUMN google_ai_token text;');
      } else {
         alert(`Gagal menyimpan pengaturan: ${error.message}`);
      }
    } else {
      alert('Pengaturan AI berhasil disimpan!');
    }
    setIsSaving(false);
  };

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const isNative = chatModel.endsWith('-native');
      const tokenToUse = isNative ? googleAiToken : openrouterToken;
      const provider = isNative ? 'google' : 'openrouter';

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

          {/* API Key Google AI */}
          <div className="pt-4">
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
              <Key size={16} /> API Key Google AI Studio (Disarankan)
            </label>
            <div className="relative flex items-center">
              <input 
                type="password" 
                value={googleAiToken}
                onChange={(e) => setGoogleAiToken(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-mono"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Dapatkan token gratis di <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-accent hover:underline">Google AI Studio</a>. Digunakan untuk model berakhiran (Native).
            </p>
          </div>

          {/* API Key OpenRouter */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
              <Key size={16} /> API Key OpenRouter (Opsional)
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
              Dapatkan token di <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-accent hover:underline">OpenRouter</a>. Digunakan jika Anda memilih model Llama atau GPT.
            </p>
          </div>

          {/* Model AI */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Model AI Utama (Pilih Sesuai Key Anda)
            </label>
            <select 
              value={chatModel}
              onChange={(e) => {
                setChatModel(e.target.value);
                setMaterialModel(e.target.value);
              }}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent text-sm appearance-none"
            >
              <optgroup label="🌐 Native Google AI Studio (Gratis 100%)">
                <option value="gemini-3.8-flash-native">Google Gemini 3.8 Flash (Paling Baru & Stabil)</option>
                <option value="gemini-2.5-flash-native">Google Gemini 2.5 Flash (Generasi Sebelumnya)</option>
              </optgroup>
              <optgroup label="🔌 Via OpenRouter API (Universal)">
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (via OpenRouter)</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini (Cerdas & Ringan)</option>
                <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Gratis tapi Terbatas)</option>
              </optgroup>
            </select>
            <p className="text-xs text-zinc-500 mt-2">
              Pastikan Anda memilih model yang sesuai dengan asal API Key Anda. Jika menggunakan Key Google (AIza...), pilih model di grup pertama.
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Aturan Dasar AI (System Prompt)
              </label>
              
              <button
                type="button"
                onClick={() => {
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
                }}
                className="flex items-center gap-1.5 text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 py-1 px-3 rounded-lg transition-colors"
              >
                <BookOpen size={14} /> Gunakan Template "Sahabat MTA"
              </button>
            </div>
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
            <div className="flex flex-wrap items-center gap-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className="flex justify-center items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
              >
                <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>

              <button 
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || (!googleAiToken && !openrouterToken)}
                className="flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
              >
                <Power size={18} /> {isTesting ? 'Menguji...' : 'Uji Koneksi AI'}
              </button>
            </div>

            {testResult && (
              <div className={`mt-4 p-4 rounded-xl text-sm font-bold flex items-start gap-2 border ${testResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {testResult.success ? <Check size={18} className="mt-0.5 flex-shrink-0" /> : <Power size={18} className="mt-0.5 flex-shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
