'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  Bell, Mail, Phone, Trash2, Check, RefreshCw, Loader2, 
  MessageSquare, Smartphone, BellRing, Inbox, Send, ShieldAlert 
} from 'lucide-react';
import PushNotificationManager from '@/app/components/PushNotificationManager';

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

function NotifikasiContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State: 'push-mobile' atau 'kotak-masukan'
  const initialTab = searchParams.get('tab') === 'masukan' ? 'kotak-masukan' : 'push-mobile';
  const [activeTab, setActiveTab] = useState<'push-mobile' | 'kotak-masukan'>(initialTab);

  // State untuk Kotak Masukan Jemaah
  const [messages, setMessages] = useState<Masukan[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Masukan | null>(null);
  const supabase = createClient();

  const fetchMessages = async () => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('kotak_masukan')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setMessages(data);
    } else {
      const fallback = await supabase
        .from('masukan')
        .select('*')
        .order('created_at', { ascending: false });
      if (!fallback.error && fallback.data) {
        setMessages(fallback.data);
      }
    }
    setLoadingMessages(false);
  };

  useEffect(() => {
    fetchMessages();
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

  const handleDeleteMessage = async (id: string) => {
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
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Tab Navigasi Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('push-mobile')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'push-mobile'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Smartphone size={14} className={activeTab === 'push-mobile' ? 'text-emerald-600' : 'text-zinc-400'} />
            <span>Push Notifikasi Mobile</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              FCM
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kotak-masukan')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'kotak-masukan'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Inbox size={14} className={activeTab === 'kotak-masukan' ? 'text-emerald-600' : 'text-zinc-400'} />
            <span>Kotak Masukan Jemaah</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-zinc-400 px-1 hidden sm:block">
          {activeTab === 'push-mobile'
            ? 'Siarkan notifikasi & pantau log FCM'
            : `${messages.length} pesan masuk`}
        </div>
      </div>

      {/* Konten Sesuai Tab Aktif */}
      {activeTab === 'push-mobile' ? (
        /* Tab 1: Push Notifikasi Mobile Manager */
        <PushNotificationManager role="admin" />
      ) : (
        /* Tab 2: Kotak Masukan Jemaah */
        <div className="space-y-6">
          {/* Header Kotak Masukan */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                <Inbox size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Pusat Masukan & Laporan Jemaah
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Daftar pesan, pertanyaan, saran, dan kritik dari formulir jemaah web.
                </p>
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
                onClick={fetchMessages}
                disabled={loadingMessages}
                className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition text-zinc-600 dark:text-zinc-300 disabled:opacity-50"
                title="Segarkan data"
              >
                <RefreshCw size={16} className={loadingMessages ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* List dan Detail Pesan */}
          {loadingMessages ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Memuat notifikasi masukan...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-12 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Bell size={22} />
              </div>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Masukan Masuk</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Belum ada pertanyaan atau laporan baru dari formulir masukan jemaah.
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
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {selectedMessage.nama_terang}
                        </h3>
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
                          onClick={() => handleDeleteMessage(selectedMessage.id)}
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
      )}
    </div>
  );
}

export default function NotifikasiPage() {
  return (
    <React.Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <p className="text-xs font-semibold">Memuat pusat notifikasi...</p>
      </div>
    }>
      <NotifikasiContent />
    </React.Suspense>
  );
}

