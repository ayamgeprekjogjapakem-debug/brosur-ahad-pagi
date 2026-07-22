'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, AlertTriangle, ShieldCheck, Plus, Check, X } from 'lucide-react';

export default function AppSettingsPage() {
  const [allowedVersions, setAllowedVersions] = useState<{version: string, is_active: boolean}[]>([{version: '1.0.0', is_active: true}]);
  const [newVersion, setNewVersion] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (settingsData) {
      setIsMaintenance(settingsData.is_maintenance || false);
    }

    const { data: versionsData } = await supabase
      .from('allowed_versions')
      .select('*')
      .order('version', { ascending: false });

    if (versionsData) {
      setAllowedVersions(versionsData.map(v => ({ version: v.version, is_active: v.is_active })));
    }
    
    setIsLoading(false);
  };

  const addVersion = () => {
    if (newVersion.trim() && !allowedVersions.find(v => v.version === newVersion.trim())) {
      setAllowedVersions([...allowedVersions, { version: newVersion.trim(), is_active: true }]);
      setNewVersion('');
    }
  };

  const toggleVersion = (versionStr: string) => {
    setAllowedVersions(allowedVersions.map(v => 
      v.version === versionStr ? { ...v, is_active: !v.is_active } : v
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save App Settings
    const { error: settingsError } = await supabase
      .from('app_settings')
      .update({
        is_maintenance: isMaintenance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    // Save Allowed Versions (Clear and Replace)
    const { error: clearError } = await supabase
      .from('allowed_versions')
      .delete()
      .neq('version', '0.0.0.0.0'); // Dummy condition to delete all rows

    if (clearError) {
      console.error('Failed to clear allowed_versions:', clearError);
    }

    let insertError = null;
    if (!clearError && allowedVersions.length > 0) {
      const res = await supabase
        .from('allowed_versions')
        .insert(allowedVersions);
      insertError = res.error;
      if (insertError) {
        console.error('Failed to insert allowed_versions:', insertError);
      }
    }

    if (settingsError || clearError || insertError) {
      alert('Gagal menyimpan pengaturan. Pastikan Policy Supabase sudah diperbarui.');
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
              Versi Aplikasi yang Diizinkan (Whitelist)
            </label>
            <p className="text-xs text-zinc-500 mb-3">
              Tambahkan versi aplikasi yang diperbolehkan mengakses server. Jika pengguna menggunakan versi di luar daftar ini, aksesnya akan ditolak.
            </p>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addVersion()}
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Contoh: 1.0.1"
              />
              <button
                onClick={addVersion}
                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> Tambah
              </button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse bg-white dark:bg-zinc-900">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-3 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Versi (v)</th>
                    <th className="p-3 font-semibold text-sm text-zinc-600 dark:text-zinc-400 text-center">Status</th>
                    <th className="p-3 font-semibold text-sm text-zinc-600 dark:text-zinc-400 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allowedVersions.map((v) => (
                    <tr key={v.version} className={`border-b border-zinc-100 dark:border-zinc-800/50 transition-colors ${!v.is_active ? 'opacity-60 bg-zinc-50 dark:bg-zinc-950' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/20'}`}>
                      <td className="p-3 text-sm font-mono text-zinc-800 dark:text-zinc-200">{v.version}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${v.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                          {v.is_active ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleVersion(v.version)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${v.is_active ? 'bg-accent' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                          title={v.is_active ? "Non-aktifkan Versi" : "Aktifkan Versi"}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${v.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allowedVersions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-sm text-red-500 font-medium">
                        Harus ada minimal 1 versi yang diizinkan! Jika kosong, semua akses akan diblokir.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
