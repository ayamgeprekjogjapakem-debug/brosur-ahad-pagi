import React from 'react';
import PengumumanManager from '@/app/components/PengumumanManager';

export const metadata = {
  title: 'Pusat Pengumuman - Super Admin Dashboard',
  description: 'Kelola pengumuman resmi dan broadcast notifikasi aplikasi mobile.',
};

export default function DashboardPengumumanPage() {
  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-200">
      <PengumumanManager role="super-admin" />
    </div>
  );
}
