'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Mail, Phone, Trash2, Check, RefreshCw, Loader2, X, AlertCircle } from 'lucide-react';

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

export default function MasukanDashboardPage() {
  const [messages, setMessages] = useState<Masukan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Masukan | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch settings
    try {
      const res = await fetch('/api/settings?key=is_feedback_enabled');
      const data = await res.json();
      if (data.value === 'false') {
        setIsFeedbackEnabled(false);
      } else {
        setIsFeedbackEnabled(true);
      }
    } catch (e) {
      console.error('Failed to fetch settings');
    }

    // Fetch messages
    const { data, error } = await supabase
      .from('masukan')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleFeedback = async () => {
    setIsToggling(true);
    const newValue = !isFeedbackEnabled;
    setIsFeedbackEnabled(newValue);
    
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'is_feedback_enabled', value: newValue.toString() })
      });
    } catch (err) {
      // Revert if failed
      setIsFeedbackEnabled(!newValue);
      alert('Gagal mengubah pengaturan.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleMarkAsRead = async (id: string, currentStatus: boolean, closeIfModal = false) => {
    const newStatus = !currentStatus;
    // Optimistic update
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, is_read: newStatus } : m));
    if (selectedMessage && selectedMessage.id === id) {
      setSelectedMessage({ ...selectedMessage, is_read: newStatus });
    }
    
    try {
      const res = await fetch(`/api/masukan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: newStatus })
      });
      if (!res.ok) throw new Error('Gagal update status');
      
      if (closeIfModal && !currentStatus) { // if marking as read from modal, wait a bit
        // do nothing specific
      }
    } catch (err) {
      // Revert if failed
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, is_read: currentStatus } : m));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({ ...selectedMessage, is_read: currentStatus });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pesan ini?')) return;
    
    try {
      const res = await fetch(`/api/masukan/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus pesan');
      
      setMessages(msgs => msgs.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      alert('Gagal menghapus pesan.');
    }
  };

  const openMessage = (msg: Masukan) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      handleMarkAsRead(msg.id, msg.is_read);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <main className="p-8 md:p-12 w-full max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <MessageSquare className="text-blue-500" /> Kotak Masukan & Laporan
          </h1>
          <p className="text-zinc-500">Baca saran, kritik, dan laporan dari pengunjung.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 bg-white  border border-black/5  px-4 py-2 rounded-xl shadow-sm">
            <div className="flex flex-col">
              <span className="text-sm font-bold">Terima Masukan</span>
              <span className="text-xs text-zinc-500">{isFeedbackEnabled ? 'Formulir Aktif' : 'Formulir Dimatikan'}</span>
            </div>
            <button 
              onClick={handleToggleFeedback}
              disabled={isToggling}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ease-in-out shrink-0 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2  ${
                isFeedbackEnabled ? 'bg-blue-500' : 'bg-zinc-300 '
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform duration-300 ease-in-out ${
                isFeedbackEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>

          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-3 h-full rounded-xl font-bold bg-white  border border-black/5  hover:bg-black/5  transition-all text-sm shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        </div>
      </header>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-500">
          <div className="relative flex items-center justify-center w-14 h-14 mb-6">
            <div className="absolute w-full h-full border-[1.5px] border-blue-500/10 rounded-full"></div>
            <div className="absolute w-full h-full border-[1.5px] border-transparent border-t-blue-500 rounded-full animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
          </div>
          <p className="text-sm font-medium text-blue-600/70 tracking-widest uppercase animate-pulse">Memuat Pesan...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white  border border-black/5  rounded-3xl p-20 text-center text-zinc-500 shadow-sm flex flex-col items-center">
          <MessageSquare size={64} className="mb-6 opacity-20" />
          <h3 className="text-2xl font-bold mb-2">Kotak Masuk Kosong</h3>
          <p>Belum ada masukan atau laporan dari pengunjung saat ini.</p>
        </div>
      ) : (
        <div className="bg-white  border border-black/5  rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black/5  text-zinc-500 text-sm">
                  <th className="p-4 font-bold w-12 text-center">Status</th>
                  <th className="p-4 font-bold">Pengirim</th>
                  <th className="p-4 font-bold">Cuplikan Pesan</th>
                  <th className="p-4 font-bold">Tanggal</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {messages.map(msg => (
                  <tr 
                    key={msg.id} 
                    onClick={() => openMessage(msg)}
                    className={`border-b border-black/5  hover:bg-blue-50/50  transition-colors cursor-pointer group ${!msg.is_read ? 'bg-blue-50/30 ' : ''}`}
                  >
                    <td className="p-4 text-center">
                      {!msg.is_read ? (
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mx-auto animate-pulse"></div>
                      ) : (
                        <Check size={16} className="text-zinc-300  mx-auto" />
                      )}
                    </td>
                    <td className="p-4">
                      <div className={`font-bold ${!msg.is_read ? 'text-zinc-900 ' : 'text-zinc-700 '}`}>
                        {msg.nama_terang}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{msg.cabang_instansi}</div>
                    </td>
                    <td className="p-4">
                      <div className={`max-w-md truncate text-sm ${!msg.is_read ? 'font-medium text-zinc-800 ' : 'text-zinc-500'}`}>
                        {msg.pesan}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-zinc-500 whitespace-nowrap">
                      {formatDate(msg.created_at)}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(msg.id);
                        }}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Hapus pesan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail Pesan */}
      {selectedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40  backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMessage(null)}>
          <div 
            className="bg-white  w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-black/5 "
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold mb-1">{selectedMessage.nama_terang}</h2>
                  <p className="text-zinc-500 font-medium">{selectedMessage.cabang_instansi}</p>
                </div>
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 bg-zinc-100  hover:bg-zinc-200  rounded-full transition-colors text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-black/5  text-sm">
                <a href={`https://wa.me/${selectedMessage.no_wa.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-green-700  hover:underline bg-green-50  px-3 py-1.5 rounded-lg font-bold border border-green-200 ">
                  <Phone size={14} /> {selectedMessage.no_wa}
                </a>
                {selectedMessage.email && (
                  <a href={`mailto:${selectedMessage.email}`} className="flex items-center gap-2 text-blue-700  hover:underline bg-blue-50  px-3 py-1.5 rounded-lg font-bold border border-blue-200 ">
                    <Mail size={14} /> {selectedMessage.email}
                  </a>
                )}
                <div className="flex items-center gap-2 text-zinc-500 px-3 py-1.5 rounded-lg bg-zinc-50  border border-zinc-200  ml-auto">
                  {formatDate(selectedMessage.created_at)}
                </div>
              </div>

              <div className="bg-zinc-50  rounded-2xl p-6 border border-zinc-100  mb-8">
                <p className="text-zinc-800  whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.pesan}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <button 
                  onClick={() => handleDelete(selectedMessage.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50  transition-colors"
                >
                  <Trash2 size={16} /> Hapus
                </button>
                <button 
                  onClick={() => handleMarkAsRead(selectedMessage.id, selectedMessage.is_read)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    selectedMessage.is_read 
                      ? 'bg-zinc-100  text-zinc-600  hover:bg-zinc-200 ' 
                      : 'bg-blue-100  text-blue-700  hover:bg-blue-200 '
                  }`}
                >
                  <Check size={16} /> {selectedMessage.is_read ? 'Tandai Belum Dibaca' : 'Tandai Dibaca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
