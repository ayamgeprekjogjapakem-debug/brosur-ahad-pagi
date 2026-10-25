import React from 'react';
import PengumumanManager from '@/app/components/PengumumanManager';

export const metadata = {
  title: 'Kelola Pengumuman - Admin Panel',
  description: 'Kelola pengumuman resmi dan siaran notifikasi aplikasi mobile.',
};

export default function AdminPengumumanPage() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-200">
      <PengumumanManager role="admin" />
    </div>
  );
}
