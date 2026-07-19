import React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <main className="p-8 md:p-12 w-full max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6">
        <Settings size={48} className="text-accent" />
      </div>
      <h1 className="text-3xl font-extrabold mb-4">Pengaturan Sistem</h1>
      <p className="text-zinc-500 max-w-md">
        Halaman ini sedang dalam tahap pengembangan. Nantinya, Anda dapat mengatur parameter sistem, batas memori, dan tampilan dasbor di sini.
      </p>
    </main>
  );
}
