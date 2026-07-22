'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AppSettingsPage() {
  const [minVersion, setMinVersion] = useState('1.0.0');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (data) {
      setMinVersion(data.min_app_version || '1.0.0');
      setIsMaintenance(data.is_maintenance || false);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .update({
        min_app_version: minVersion,
        is_maintenance: isMaintenance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      alert('Gagal menyimpan pengaturan.');
    } else {
      alert('Pengaturan berhasil disimpan!');
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8">Memuat pengaturan...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">Kontrol Aplikasi Mobile</h1>
      
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-2xl">
        <div className="space-y-6">
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
              Versi Minimal Aplikasi
            </label>
            <p className="text-xs text-zinc-500 mb-3">
              Jika pengguna memakai versi di bawah ini, mereka akan dipaksa untuk meng-update aplikasi.
            </p>
            <input 
              type="text" 
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Contoh: 1.0.0"
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Mode Pemeliharaan (Maintenance)
                </label>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Aktifkan ini untuk memblokir semua akses ke aplikasi sementara waktu.
                </p>
              </div>
              <button
                onClick={() => setIsMaintenance(!isMaintenance)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isMaintenance ? 'bg-red-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isMaintenance ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
            {isMaintenance && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">Aplikasi saat ini dalam status Maintenance. Pengguna tidak akan bisa mengakses data terbaru dari server.</p>
              </div>
            )}
          </div>

          <div className="pt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
