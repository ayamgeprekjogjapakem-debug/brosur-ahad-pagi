'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ShieldBan, Plus, Trash2 } from 'lucide-react';

export default function BlockedIpsPage() {
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchBlockedIps();
  }, []);

  const fetchBlockedIps = async () => {
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setBlockedIps(data);
    }
    setIsLoading(false);
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    
    setIsAdding(true);
    const { error } = await supabase
      .from('blocked_ips')
      .insert({
        ip_address: newIp.trim(),
        reason: newReason.trim() || 'Aktivitas mencurigakan',
      });
      
    if (error) {
      alert(`Gagal memblokir IP: ${error.message}`);
    } else {
      setNewIp('');
      setNewReason('');
      fetchBlockedIps();
    }
    setIsAdding(false);
  };

  const handleUnblock = async (ipId: string) => {
    if (!confirm('Apakah Anda yakin ingin membuka blokir IP ini?')) return;
    
    const { error } = await supabase
      .from('blocked_ips')
      .delete()
      .eq('id', ipId);
      
    if (error) {
      alert('Gagal membuka blokir');
    } else {
      fetchBlockedIps();
    }
  };

  if (isLoading) return <div className="p-8">Memuat daftar blokir...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
        <ShieldBan size={24} className="text-red-500" />
        Daftar Blokir IP (Blacklist)
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Tambah Blokir */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h2 className="font-bold mb-4 text-zinc-800 dark:text-zinc-200">Blokir IP Baru</h2>
            <form onSubmit={handleAddBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Alamat IP</label>
                <input 
                  type="text" 
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Contoh: 192.168.1.1"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Alasan (Opsional)</label>
                <input 
                  type="text" 
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Contoh: Spam request"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
              <button 
                type="submit" 
                disabled={isAdding}
                className="w-full flex justify-center items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
              >
                <Plus size={16} /> {isAdding ? 'Menambahkan...' : 'Blokir IP Ini'}
              </button>
            </form>
          </div>
        </div>

        {/* Tabel Daftar Blokir */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Alamat IP</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Alasan</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Tanggal Diblokir</th>
                    <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500">
                        Tidak ada IP yang diblokir saat ini.
                      </td>
                    </tr>
                  ) : (
                    blockedIps.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="p-4 text-sm font-mono font-bold text-red-500">
                          {item.ip_address}
                        </td>
                        <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.reason}
                        </td>
                        <td className="p-4 text-sm text-zinc-500">
                          {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleUnblock(item.id)}
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
