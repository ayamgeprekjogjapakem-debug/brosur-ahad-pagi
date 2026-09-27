import Link from 'next/link';
import { Compass, Home, BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-4 selection:bg-emerald-200">
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Animated Icon */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
          <div className="relative z-10 w-24 h-24 bg-white shadow-xl rounded-full flex items-center justify-center text-emerald-600 border border-emerald-50">
            <Compass size={48} className="animate-[spin_4s_linear_infinite]" />
          </div>
        </div>

        {/* Text content */}
        <div className="space-y-4">
          <h1 className="text-8xl font-black text-slate-200 tracking-tighter">404</h1>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Halaman Tidak Ditemukan</h2>
          <p className="text-slate-500 font-medium">
            Maaf, kami tidak dapat menemukan halaman yang Anda cari. Mungkin tautannya rusak atau halaman telah dipindahkan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
          <Link 
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Kembali ke Beranda
          </Link>
          <Link 
            href="/quran"
            className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <BookOpen size={18} />
            Baca Al-Qur'an
          </Link>
        </div>

        {/* Branding */}
        <div className="pt-12">
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            Pustaka MTA &copy; {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  );
}
