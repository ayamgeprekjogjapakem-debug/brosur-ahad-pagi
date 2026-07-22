'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Activity, ShieldBan } from 'lucide-react';
import Link from 'next/link';

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Tampilkan 100 terakhir
    
    if (data) {
      setLogs(data);
    }
    setIsLoading(false);
  };

  if (isLoading) return <div className="p-8">Memuat log akses...</div>;

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Activity size={24} className="text-accent" />
          Log Akses Pengguna
        </h1>
        <Link 
          href="/dashboard/blocked-ips"
          className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
        >
          <ShieldBan size={16} /> Kelola Blokir IP
        </Link>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Waktu</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Alamat IP</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Versi App</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Info Perangkat</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    Belum ada data akses terekam.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="p-4 text-sm whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss', { locale: id })}
                    </td>
                    <td className="p-4 text-sm font-mono text-zinc-800 dark:text-zinc-200">
                      {log.ip_address}
                    </td>
                    <td className="p-4 text-sm">
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs font-medium">
                        v{log.app_version || '?'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                      {log.device_info}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
