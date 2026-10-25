import React from 'react';
import HelpManager from '@/app/components/HelpManager';

export const metadata = {
  title: 'Konsultasi Hadist & WhatsApp Help - Admin Panel',
  description: 'Kelola daftar kontak konsultan hadits dan bantuan WhatsApp untuk aplikasi mobile dan web.',
};

export default function AdminHelpPage() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-200">
      <HelpManager role="admin" />
    </div>
  );
}
