'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfToday, endOfToday, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { ArrowLeft, User, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function IpDetailLogsPage() {
  const params = useParams();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const supabase = createClient();
  
  const ipParam = typeof params?.ip === 'string' ? params.ip : '';
  const decodedIp = ipParam ? decodeURIComponent(ipParam) : '';

  useEffect(() => {
    setCurrentPage(1);
    fetchLogs();
  }, [dateFilter, decodedIp]);

  const fetchLogs = async () => {
    if (!decodedIp) return;
    
    setIsLoading(true);
    let query = supabase
      .from('access_logs')
      .select('*')
      .eq('ip_address', decodedIp)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (dateFilter !== 'all') {
      let start, end;
      if (dateFilter === 'today') {
        start = startOfToday();
        end = endOfToday();
      } else if (dateFilter === 'yesterday') {
        start = startOfYesterday();
        end = endOfYesterday();
      } else if (dateFilter === 'this_week') {
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
      } else if (dateFilter === 'this_month') {
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
      }
      if (start && end) {
        query = query
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
      }
    }

    const { data, error } = await query;
    if (data) {
      setLogs(data);
    }
    setIsLoading(false);
  };

  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    const grouped: Record<string, { label: string, dateObj: Date, count: number }> = {};
    
    logs.forEach(log => {
      const d = new Date(log.created_at);
      let key = '';
      let label = '';
      
      if (dateFilter === 'today' || dateFilter === 'yesterday') {
        key = format(d, 'yyyy-MM-dd-HH');
        label = format(d, 'HH:00');
      } else if (dateFilter === 'this_week' || dateFilter === 'this_month') {
        key = format(d, 'yyyy-MM-dd');
        label = format(d, 'dd MMM', { locale: id });
      } else {
        key = format(d, 'yyyy-MM');
        label = format(d, 'MMM yyyy', { locale: id });
      }
      
      if (!grouped[key]) {
        grouped[key] = { label, dateObj: d, count: 0 };
      }
      grouped[key].count += 1;
    });
    
    return Object.values(grouped)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({ label: item.label, jumlah: item.count }));
  }, [logs, dateFilter]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logs.length / itemsPerPage);

  const latestLocation = logs.length > 0 ? logs.find(l => l.location && l.location !== 'Unknown')?.location || 'Unknown' : 'Unknown';

  return (
    <div className="p-8">
      <Link 
        href="/dashboard/access-logs"
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-6 w-fit"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Kembali ke Daftar</span>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-accent/10 p-3 rounded-2xl text-accent">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
              {decodedIp}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-zinc-500 dark:text-zinc-400">
              <MapPin size={16} />
              <span>{latestLocation}</span>
            </div>
            <p className="text-sm font-semibold text-accent mt-2">
              Total Akses: {logs.length}x
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-accent"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="yesterday">Kemarin</option>
            <option value="this_week">Pekan Ini</option>
            <option value="this_month">Bulan Ini</option>
          </select>
        </div>
      </div>
      
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Grafik Akses</h2>
          <div className="h-64 w-full text-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={12} stroke="#71717a" />
                <YAxis axisLine={false} tickLine={false} tickMargin={12} stroke="#71717a" allowDecimals={false} />
                <Tooltip 
                  cursor={{fill: '#3f3f46', opacity: 0.1}} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#fff' }}
                  itemStyle={{ color: '#0ea5e9' }}
                />
                <Bar dataKey="jumlah" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 gap-4">
          <h3 className="font-semibold text-zinc-900 dark:text-white">Riwayat Detail</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white px-3 py-1.5 rounded-lg text-sm outline-none focus:border-accent"
            >
              {[5, 10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Waktu Akses</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Versi App</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Info Perangkat</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-zinc-500">
                    Tidak ada data ditemukan untuk filter ini.
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-zinc-500">
                    Memuat data...
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss', { locale: id })}
                    </td>
                    <td className="p-4 text-sm">
                      <span className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded text-xs font-medium">
                        {log.app_version === 'Web' ? 'Web Visitor' : `v${log.app_version || '?'}`}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                      {log.device_info}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between bg-zinc-50 dark:bg-zinc-950/50 gap-4">
            <span className="text-sm text-zinc-500">
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, logs.length)} dari {logs.length} data
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
