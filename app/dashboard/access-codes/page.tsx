'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Key, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function AccessCodesPage() {
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newHasAiAccess, setNewHasAiAccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchAccessCodes();
  }, []);

  const fetchAccessCodes = async () => {
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setAccessCodes(data);
    }
    setIsLoading(false);
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    
    setIsAdding(true);
    const { error } = await supabase
      .from('access_codes')
      .insert({
        code: newCode.trim(),
        description: newDescription.trim() || 'Akses Khusus',
        is_active: true,
        has_ai_access: newHasAiAccess,
      });
      
    if (error) {
      alert(`Gagal menambah kode akses: ${error.message}`);
    } else {
      setNewCode('');
      setNewDescription('');
      setNewHasAiAccess(false);
      fetchAccessCodes();
    }
    setIsAdding(false);
  };

  const handleDelete = async (codeId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kode akses ini?')) return;
    
    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', codeId);
      
    if (error) {
      alert('Gagal menghapus kode akses');
    } else {
      fetchAccessCodes();
    }
  };

  const handleToggleActive = async (codeId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('access_codes')
      .update({ is_active: !currentStatus })
      .eq('id', codeId);
      
    if (error) {
      alert('Gagal mengubah status');
    } else {
      fetchAccessCodes();
    }
  };

  const handleToggleAiAccess = async (codeId: string, currentAiAccess: boolean) => {
    const { error } = await supabase
      .from('access_codes')
      .update({ has_ai_access: !currentAiAccess })
      .eq('id', codeId);
      
    if (error) {
      alert('Gagal mengubah hak akses AI');
    } else {
      fetchAccessCodes();
    }
  };

  if (isLoading) return <div className="p-8">Memuat daftar kode akses...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
        <Key size={24} className="text-accent" />
        Manajemen Kode Akses
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Tambah Kode */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h2 className="font-bold mb-4 text-zinc-800 dark:text-zinc-200">Buat Kode Baru</h2>
            <form onSubmit={handleAddCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Kode Akses</label>
                <input 
                  type="text" 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: ALBATI123"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent text-sm uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Deskripsi (Opsional)</label>
                <input 
                  type="text" 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Contoh: Akses Jamaah 2026"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="aiAccess"
                  checked={newHasAiAccess}
                  onChange={(e) => setNewHasAiAccess(e.target.checked)}
                  className="w-4 h-4 text-accent bg-zinc-50 border-zinc-200 rounded focus:ring-accent dark:bg-zinc-800 dark:border-zinc-700"
                />
                <label htmlFor="aiAccess" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Beri Akses Fitur AI
                </label>
              </div>
              <button 
                type="submit" 
                disabled={isAdding}
                className="w-full flex justify-center items-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
              >
                <Plus size={16} /> {isAdding ? 'Menyimpan...' : 'Buat Kode'}
              </button>
            </form>
          </div>
        </div>

        {/* Tabel Daftar Kode */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Kode</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Deskripsi</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Status Akun</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Akses AI</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Dibuat Pada</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {accessCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        Tidak ada kode akses saat ini.
                      </td>
                    </tr>
                  ) : (
                    accessCodes.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="p-4 text-sm font-mono font-bold text-accent">
                          {item.code}
                        </td>
                        <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.description}
                        </td>
                        <td className="p-4 text-sm">
                          <button 
                            onClick={() => handleToggleActive(item.id, item.is_active)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}
                          >
                            {item.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="p-4 text-sm">
                          <button 
                            onClick={() => handleToggleAiAccess(item.id, item.has_ai_access)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${item.has_ai_access ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}
                          >
                            {item.has_ai_access ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {item.has_ai_access ? 'Diizinkan' : 'Dilarang'}
                          </button>
                        </td>
                        <td className="p-4 text-sm text-zinc-500">
                          {format(new Date(item.created_at), 'dd MMM yyyy', { locale: id })}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-red-500 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Trash2 size={14} /> Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
