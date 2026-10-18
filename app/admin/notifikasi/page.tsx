'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bell, Mail, Phone, Trash2, Check, RefreshCw, Loader2, MessageSquare, AlertCircle } from 'lucide-react';

interface Masukan {
  id: string;
  nama_terang: string;
  cabang_instansi: string;
  email: string | null;
  no_wa: string;
  pesan: string;
  is_read: boolean;
  created_at: string;
}

export default function NotifikasiPage() {
  const [messages, setMessages] = useState<Masukan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Masukan | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kotak_masukan')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setMessages(data);
    } else {
      // Fallback tabel masukan jika kotak_masukan berbeda
      const fallback = await supabase
        .from('masukan')
        .select('*')
        .order('created_at', { ascending: false });
      if (!fallback.error && fallback.data) {
        setMessages(fallback.data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('kotak_masukan')
        .update({ is_read: !currentStatus })
        .eq('id', id);

      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: !currentStatus } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, is_read: !currentStatus } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus notifikasi/pesan ini?')) return;
    try {
      await supabase.from('kotak_masukan').delete().eq('id', id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Notifikasi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <Bell size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Pusat Notifikasi & Masukan Jemaah
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pantau laporan, pertanyaan, kritik, dan saran dari pengunjung web.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            {unreadCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{unreadCount} Belum Dibaca</span>
            ) : (
              <span>Semua Sudah Dibaca</span>
            )}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition text-zinc-600 dark:text-zinc-300 disabled:opacity-50"
            title="Segarkan data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Konten Notifikasi */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Memuat notifikasi...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Bell size={22} />
          </div>
          <h3 className="font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Notifikasi</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Belum ada pesan atau pertanyaan baru yang masuk dari formulir masukan jemaah.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daftar Pesan */}
          <div className="lg:col-span-1 space-y-2.5 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
            {messages.map((m) => {
              const isSelected = selectedMessage?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMessage(m)}
                  className={`p-4 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : m.is_read
                      ? 'bg-white dark:bg-zinc-900 border-black/5 dark:border-white/10 hover:border-black/20'
                      : 'bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                      {m.nama_terang || 'Anonim'}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mb-1.5 truncate">
                    {m.cabang_instansi || 'MTA'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {m.pesan}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detail Pesan Terpilih */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/10">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedMessage.nama_terang}
                    </h2>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      {selectedMessage.cabang_instansi}
                    </p>
                    <span className="text-[11px] text-zinc-400 block mt-1">
                      Diterima: {new Date(selectedMessage.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMarkAsRead(selectedMessage.id, selectedMessage.is_read)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 transition"
                    >
                      {selectedMessage.is_read ? 'Tandai Belum Dibaca' : 'Tandai Sudah Dibaca'}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-500/10 transition"
                      title="Hapus Pesan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Kontak */}
                <div className="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-300">
                  {selectedMessage.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={14} className="text-zinc-400" />
                      <span>{selectedMessage.email}</span>
                    </div>
                  )}
                  {selectedMessage.no_wa && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="text-emerald-500" />
                      <span>{selectedMessage.no_wa}</span>
                    </div>
                  )}
                </div>

                {/* Isi Pesan */}
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.pesan}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-12 text-center text-zinc-400 h-full flex flex-col items-center justify-center min-h-[300px]">
                <MessageSquare size={36} className="text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Pilih salah satu pesan di sebelah kiri</p>
                <p className="text-xs text-zinc-400">Detail pesan, identitas pengirim, dan kontak akan ditampilkan di sini.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
