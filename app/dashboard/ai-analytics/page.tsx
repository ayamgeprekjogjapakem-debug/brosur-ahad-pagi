'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Activity, BrainCircuit, Search, Calendar, ChevronRight, Loader2, Sparkles, TrendingUp } from 'lucide-react';

export default function AiAnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCacheData();
  }, []);

  const fetchCacheData = async () => {
    setIsLoading(true);
    // Mengambil data dari tabel search_intent_cache
    const { data: cacheData, error } = await supabase
      .from('search_intent_cache')
      .select('*')
      .order('frekuensi_pencarian', { ascending: false })
      .limit(50);

    if (cacheData) {
      setData(cacheData);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex-1">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3 text-zinc-900 ">
            <BrainCircuit className="text-accent" size={32} />
            Analisa Pencarian AI
          </h1>
          <p className="text-zinc-500">
            Memonitor riwayat kebiasaan pengguna dan sistem caching intent dari OpenRouter.
          </p>
        </div>
        <div className="bg-emerald-50  px-4 py-3 rounded-2xl border border-emerald-100  flex items-center gap-3">
          <Sparkles className="text-emerald-500" size={20} />
          <div>
            <p className="text-xs font-bold text-emerald-700  uppercase tracking-widest">Sistem Hemat Token Aktif</p>
            <p className="text-[10px] text-emerald-600  mt-0.5">Memcached dari {data.length} kueri teratas</p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-accent">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white  rounded-3xl p-12 text-center border border-zinc-200 ">
          <Activity className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-700 ">Belum Ada Data Pencarian</h3>
          <p className="text-sm text-zinc-500 mt-2">Data cache pencarian AI akan muncul di sini setelah tabel <code>search_intent_cache</code> terisi.</p>
        </div>
      ) : (
        <div className="bg-white  rounded-3xl border border-zinc-200  overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50  text-xs uppercase font-bold text-zinc-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Query Asli (User)</th>
                  <th className="px-6 py-4">Koreksi Typo (AI)</th>
                  <th className="px-6 py-4">Kategori (AI)</th>
                  <th className="px-6 py-4">Frekuensi</th>
                  <th className="px-6 py-4 text-right">Terakhir Dicari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 ">
                {data.map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-zinc-50  transition-colors">
                    <td className="px-6 py-4 font-semibold text-zinc-900 ">
                      "{item.query_asli}"
                    </td>
                    <td className="px-6 py-4">
                      {item.query_koreksi ? (
                        <span className="text-emerald-600  font-medium">{item.query_koreksi}</span>
                      ) : (
                        <span className="text-zinc-400 italic">Tidak ada typo</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.kategori_ditebak ? (
                        <span className="bg-accent/10 text-accent px-2.5 py-1 rounded-md font-bold text-xs">
                          {item.kategori_ditebak}
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-amber-500">
                        <TrendingUp size={14} />
                        {item.frekuensi_pencarian || 1}x
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-zinc-500 font-medium">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
