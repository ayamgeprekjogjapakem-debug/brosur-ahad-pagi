'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, AlertTriangle, ShieldCheck, Plus, Check, X, Edit2, Trash2 } from 'lucide-react';

export default function AppSettingsPage() {
  const [allowedVersions, setAllowedVersions] = useState<{version: string, is_active: boolean}[]>([{version: '1.0.0', is_active: true}]);
  const [newVersion, setNewVersion] = useState('');
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
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

  const deleteVersion = async (versionStr: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus versi ini?')) {
      const { error } = await supabase
        .from('allowed_versions')
        .delete()
        .eq('version', versionStr);

      if (error) {
        console.error('Failed to delete version:', error);
        alert('Gagal menghapus versi dari database.');
        return;
      }

      setAllowedVersions(allowedVersions.filter(v => v.version !== versionStr));
    }
  };

  const startEdit = (versionStr: string) => {
    setEditingVersion(versionStr);
    setEditValue(versionStr);
  };

  const saveEdit = (oldVersion: string) => {
    if (editValue.trim() && !allowedVersions.find(v => v.version === editValue.trim() && v.version !== oldVersion)) {
      setAllowedVersions(allowedVersions.map(v => 
        v.version === oldVersion ? { ...v, version: editValue.trim() } : v
      ));
      setEditingVersion(null);
      setEditValue('');
    } else if (allowedVersions.find(v => v.version === editValue.trim() && v.version !== oldVersion)) {
      alert('Versi ini sudah ada!');
    } else {
      setEditingVersion(null);
    }
  };

  const cancelEdit = () => {
    setEditingVersion(null);
    setEditValue('');
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
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 ">Kontrol Aplikasi Mobile</h1>
      
      <div className="bg-white  rounded-3xl p-8 border border-zinc-200  shadow-sm max-w-2xl">
        <div className="space-y-6">
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-700 ">
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
                className="flex-1 bg-zinc-50  border border-zinc-200  rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Contoh: 1.0.1"
              />
              <button
                onClick={addVersion}
                className="bg-zinc-900  text-white  px-4 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> Tambah
              </button>
            </div>

            <div className="border border-zinc-200  rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse bg-white ">
                <thead>
                  <tr className="bg-zinc-50  border-b border-zinc-200 ">
                    <th className="p-3 font-semibold text-sm text-zinc-600 ">Versi (v)</th>
                    <th className="p-3 font-semibold text-sm text-zinc-600  text-center">Status</th>
                    <th className="p-3 font-semibold text-sm text-zinc-600  text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allowedVersions.map((v) => (
                    <tr key={v.version} className={`border-b border-zinc-100  transition-colors ${!v.is_active ? 'opacity-60 bg-zinc-50 ' : 'hover:bg-zinc-50 '}`}>
                      <td className="p-3 text-sm font-mono text-zinc-800 ">
                        {editingVersion === v.version ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(v.version)}
                              className="border border-zinc-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                              autoFocus
                            />
                          </div>
                        ) : (
                          v.version
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${v.is_active ? 'bg-green-100 text-green-700  ' : 'bg-zinc-100 text-zinc-600  '}`}>
                          {v.is_active ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {editingVersion === v.version ? (
                            <>
                              <button onClick={() => saveEdit(v.version)} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors" title="Simpan">
                                <Check size={16} />
                              </button>
                              <button onClick={cancelEdit} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Batal">
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(v.version)}
                                className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                title="Edit Versi"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => toggleVersion(v.version)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${v.is_active ? 'bg-accent' : 'bg-zinc-300 '}`}
                                title={v.is_active ? "Non-aktifkan Versi" : "Aktifkan Versi"}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${v.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                              <button
                                onClick={() => deleteVersion(v.version)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                title="Hapus Versi"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
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

          <div className="pt-4 border-t border-zinc-100 ">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 ">
                  Mode Pemeliharaan (Maintenance)
                </label>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Aktifkan ini untuk memblokir semua akses ke aplikasi sementara waktu.
                </p>
              </div>
              <button
                onClick={() => setIsMaintenance(!isMaintenance)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isMaintenance ? 'bg-red-500' : 'bg-zinc-300 '}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isMaintenance ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
            {isMaintenance && (
              <div className="mt-4 p-4 bg-red-50  text-red-600  rounded-xl flex items-start gap-3">
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
