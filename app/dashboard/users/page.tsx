import React from 'react';
import { UserCog } from 'lucide-react';

export default function UsersPage() {
  return (
    <main className="p-8 md:p-12 w-full max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6">
        <UserCog size={48} className="text-accent" />
      </div>
      <h1 className="text-3xl font-extrabold mb-4">Manajemen Pengguna</h1>
      <p className="text-zinc-500 max-w-md">
        Halaman ini sedang dalam tahap pengembangan. Nantinya, Anda dapat mengelola akun admin, menyetujui akses pengguna baru, dan mengatur perizinan sistem.
      </p>
    </main>
  );
}
