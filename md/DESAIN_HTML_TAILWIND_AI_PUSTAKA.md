# Desain HTML & Tailwind CSS - Halaman AI Pustaka (`http://localhost:3000/ai-pustaka`)

Dokumen ini berisi kode **HTML murni** menggunakan framework utility **Tailwind CSS** (dilengkapi CDN Tailwind & Google Fonts). Kode ini merefleksikan seluruh elemen visual dan interaksi pada halaman **`http://localhost:3000/ai-pustaka`**, meliputi:
1. **Sidebar Terpadu**: Tombol Percakapan Baru, Riwayat Sesi Saya, Feed Komunitas (Terbaru & Populer).
2. **Header Bar**: Tombol Toggle Sidebar, Tombol Beranda, Judul Sesi Aktif, dan Tombol Riwayat.
3. **Top Thinking / Progress Bar**: Indikator saat AI sedang menelaah arsip.
4. **Hero Canvas (State Awal)**: Sambutan *"Assalamu'alaikum, Ustadz"*, Badge *Asma'*, dan 4 Kartu Starter Prompt.
5. **Thread Percakapan**:
   - Bubble Prompt Pengguna (dengan aksi Salin & Edit).
   - Agentic Thinking Steps (*Dropdown* telaah arsip).
   - Blok Dalil Teks Arab (*Font Scheherazade New*, RTL, border emerald).
   - Box Rujukan Terverifikasi (10–20 arsip brosur).
   - Aksi Salin & Bagikan.
6. **Input Bar Melayang di Bawah**: Input teks responsif, tombol kirim gradien, dan teks privasi aman.

---

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asma' (Asisten Majlis Tafsir Al Qur'an) - AI Pustaka MTA</title>

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Google Fonts: Plus Jakarta Sans & Scheherazade New untuk Teks Arab Hadits -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            arabic: ['"Scheherazade New"', 'serif']
          }
        }
      }
    }
  </script>
</head>
<body class="bg-[#fafaf9] font-sans text-slate-800 antialiased selection:bg-emerald-200">

  <div class="flex h-screen overflow-hidden">

    <!-- ========================================================================= -->
    <!-- 1. UNIFIED MAIN SIDEBAR (Navigasi, Riwayat Sesi, Feed Percakapan)        -->
    <!-- ========================================================================= -->
    <aside class="w-80 bg-white border-r border-slate-200/80 flex flex-col shrink-0 z-30 transition-all duration-300">
      
      <!-- Header Sidebar: Brand Logo & Tombol Tutup -->
      <div class="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-sm font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-900 leading-tight">Pustaka MTA</h1>
            <p class="text-[11px] font-medium text-emerald-700">Asma' AI Engine</p>
          </div>
        </a>
      </div>

      <!-- Tombol Buat Percakapan Baru (+ Percakapan Baru) -->
      <div class="p-4 border-b border-slate-100">
        <button class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-medium text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Percakapan Baru</span>
        </button>
      </div>

      <!-- Konten Scrollable Sidebar: Riwayat Sesi Lokal & Feed Komunitas -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
        
        <!-- Bagian: Sesi Saya (Tersimpan Lokal di Perangkat) -->
        <div>
          <div class="flex items-center justify-between text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-2 px-2">
            <span>Riwayat Sesi Saya</span>
            <span class="hover:text-red-500 cursor-pointer" title="Bersihkan Cache">Hapus Semua</span>
          </div>

          <div class="space-y-1">
            <!-- Item Sesi Aktif -->
            <div class="group flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/70 cursor-pointer transition">
              <div class="flex items-center gap-2 min-w-0">
                <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span class="truncate">Hukum Shalat Tahajud & Witir</span>
              </div>
              <button class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition" title="Hapus sesi">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <!-- Item Sesi Riwayat 2 -->
            <div class="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium cursor-pointer transition">
              <div class="flex items-center gap-2 min-w-0">
                <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span class="truncate">Dalil Aqiqah Hari ke-7</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bagian: Telaah Populer Komunitas -->
        <div>
          <div class="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-2 px-2">
            <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.316.492-.593 1.05-.845 1.62-.507 1.144-.954 2.45-1.35 3.73-.396 1.282-.72 2.548-.962 3.655-.17.77-.31 1.48-.415 2.08-.052.3-.092.565-.121.78a6.974 6.974 0 00-.065.55A6.993 6.993 0 0010 18a6.994 6.994 0 006.385-4.135 7.02 7.02 0 00-.065-.55c-.03-.215-.07-.48-.121-.78-.105-.6-.245-1.31-.415-2.08-.242-1.107-.566-2.373-.962-3.655-.396-1.28-.843-2.586-1.35-3.73-.252-.57-.53-1.128-.845-1.62a3.83 3.83 0 00-.822-.88z" clip-rule="evenodd" />
            </svg>
            <span>Telaah Populer</span>
          </div>

          <div class="space-y-1">
            <a href="#" class="block p-2 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-emerald-800 truncate transition">
              • Ketentuan Zakat Mal & Pertanian
            </a>
            <a href="#" class="block p-2 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-emerald-800 truncate transition">
              • Adab Bermuamalah Jual Beli
            </a>
          </div>
        </div>

      </div>

      <!-- Footer Sidebar: Tautan ke Beranda -->
      <div class="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <a href="/" class="flex items-center gap-1.5 hover:text-slate-800 font-medium transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Beranda Pustaka</span>
        </a>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">v2.5</span>
      </div>

    </aside>

    <!-- ========================================================================= -->
    <!-- 2. MAIN CHAT WORKSPACE                                                    -->
    <!-- ========================================================================= -->
    <main class="flex-1 flex flex-col relative h-full bg-white overflow-hidden min-w-0">

      <!-- Header Bar Workspace (Sticky Top) -->
      <header class="h-16 sticky top-0 left-0 right-0 px-4 sm:px-6 flex items-center justify-between z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <!-- Toggle Hamburger Mobile -->
          <button class="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition shrink-0 cursor-pointer" title="Buka/Tutup Sidebar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <a href="/" class="p-2 text-slate-500 hover:text-slate-800 hidden sm:flex items-center gap-1.5 text-xs font-medium rounded-lg hover:bg-slate-50 transition shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Beranda</span>
          </a>

          <div class="h-5 w-px bg-slate-200 hidden sm:block mx-1"></div>

          <!-- Title Badge Asma' -->
          <div class="flex items-center gap-2.5 truncate">
            <div class="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/images/logo_asma.png" alt="Logo Asma'" class="w-full h-full object-contain" />
            </div>
            <span class="font-semibold text-sm sm:text-[15px] text-slate-900 truncate">
              Hukum Shalat Tahajud & Witir
            </span>
          </div>
        </div>

        <!-- Tombol Riwayat -->
        <div class="flex items-center gap-2 shrink-0">
          <a href="/ai-pustaka/riwayat" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300 shadow-xs transition">
            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Riwayat</span>
          </a>
        </div>
      </header>

      <!-- Top Thinking Progress Bar (Muncul saat proses pencarian RAG berjalan) -->
      <div class="sticky top-16 left-0 right-0 z-20 bg-emerald-50/95 backdrop-blur-md border-b border-emerald-200/80 shadow-xs">
        <div class="h-1 w-full bg-emerald-100 overflow-hidden relative">
          <div class="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 w-1/2 rounded-full animate-pulse"></div>
        </div>
        <div class="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-emerald-900 font-bold truncate">
            <span class="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
            <span class="truncate">Membaca arsip & indeks matan hadits terkait shalat tahajud...</span>
          </div>
          <span class="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold uppercase">
            Target: 10–20 Rujukan
          </span>
        </div>
      </div>

      <!-- Thread Area Percakapan -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 space-y-6 pb-48 sm:pb-52">
        <div class="max-w-3xl mx-auto space-y-7">

          <!-- =================================================================== -->
          <!-- STATE A: GEMINI-STYLE ENTRANCE HERO (Saat Membuka Percakapan Baru) -->
          <!-- =================================================================== -->
          <div class="pt-2 pb-6 space-y-6">
            <div class="text-center flex flex-col items-center justify-center space-y-3.5 py-4">
              <!-- Logo Asma' -->
              <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200/70 p-2.5 shadow-sm flex items-center justify-center transition-transform hover:scale-105">
                <img src="/images/logo_asma.png" alt="Logo Asma'" class="w-full h-full object-contain" />
              </div>

              <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200/60 shadow-xs">
                <img src="/images/logo_asma.png" alt="Logo Asma'" class="w-3.5 h-3.5 object-contain shrink-0" />
                <span>Asma' (Asisten Majlis Tafsir Al Qur'an)</span>
              </div>

              <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-800 flex items-center justify-center gap-1">
                <span>Assalamu'alaikum, Ustadz</span>
                <span class="w-2.5 h-7 bg-emerald-600 animate-pulse inline-block ml-0.5 rounded-sm"></span>
              </h2>

              <p class="text-slate-500 text-sm sm:text-base font-normal max-w-xl leading-relaxed text-center mx-auto">
                Silakan ajukan pertanyaan seputar Materi Brosur, dalil ibadah, atau materi kajian Brosur Ahad Pagi MTA (1995–2026).
              </p>
            </div>

            <!-- Grid 4 Starter Suggestion Cards -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Mulai Telaah Cepat</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <!-- Kartu 1 -->
                <button class="text-left p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 transition-all shadow-xs cursor-pointer flex flex-col justify-between gap-2.5 group">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                      Kajian Keluarga
                    </span>
                    <svg class="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-slate-800 group-hover:text-emerald-900">Dalil Aqiqah Hari ke-7</h3>
                    <p class="text-xs text-slate-400 group-hover:text-slate-500 mt-1 line-clamp-2">Carikan dalil hadits aqiqah di hari ke-7 lengkap dengan teks Arab dan penjelasannya.</p>
                  </div>
                </button>

                <!-- Kartu 2 -->
                <button class="text-left p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 transition-all shadow-xs cursor-pointer flex flex-col justify-between gap-2.5 group">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                      Ibadah Sunnah
                    </span>
                    <svg class="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-slate-800 group-hover:text-emerald-900">Tata Cara Shalat Tahajud & Witir</h3>
                    <p class="text-xs text-slate-400 group-hover:text-slate-500 mt-1 line-clamp-2">Bagaimana tuntunan rakaat shalat tahajud dan witir berdasar hadits shahih?</p>
                  </div>
                </button>

              </div>
            </div>
          </div>

          <!-- =================================================================== -->
          <!-- STATE B: CHAT THREAD (Pesan Pengguna & Jawaban AI Asma')           -->
          <!-- =================================================================== -->

          <!-- 1. Pesan Pengguna (User Message) -->
          <div class="flex justify-end">
            <div class="group relative flex flex-col items-end max-w-[85%] sm:max-w-[80%]">
              <div class="bg-emerald-600 text-white rounded-2xl py-2.5 px-4 text-xs sm:text-[13px] font-medium shadow-xs leading-relaxed text-left">
                Bagaimana tuntunan shalat tahajud dan witir beserta dalil haditsnya di Brosur Ahad Pagi MTA?
              </div>

              <!-- Tombol Aksi Pesan Pengguna (Salin & Edit) -->
              <div class="flex items-center gap-1 mt-1 opacity-80 hover:opacity-100 transition-opacity">
                <button class="p-1 px-2 text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition flex items-center gap-1 cursor-pointer">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  <span>Salin</span>
                </button>
                <button class="p-1 px-2 text-[11px] text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition flex items-center gap-1 cursor-pointer">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  <span>Edit & Rebuild</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. Pesan Balasan AI (Asma' Response) -->
          <div class="flex gap-3.5">
            <!-- Avatar Bot Icon -->
            <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <div class="flex-1 min-w-0 text-slate-800 space-y-4">
              
              <!-- Agentic Thinking Steps Collapsible (Ala Gambar Referensi) -->
              <details open class="group border border-slate-200/80 rounded-2xl bg-slate-50/70 px-4 py-2.5 text-xs sm:text-[13px] transition-all">
                <summary class="cursor-pointer select-none flex items-center justify-between gap-2 text-slate-600 hover:text-slate-900 font-medium list-none">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-emerald-600 font-bold">✓</span>
                    <span class="truncate">
                      Telah membaca & menelaah <strong class="text-slate-800 font-bold">14 rujukan relevan</strong> · 1.6 dtk
                    </span>
                  </div>
                  <span class="text-[11px] font-semibold text-emerald-700 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>

                <div class="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-1.5 text-slate-600 font-normal">
                  <div class="flex items-start gap-2.5">
                    <span class="text-slate-500 font-bold select-none shrink-0">✓</span>
                    <span>Membaca Khazanah Pustaka Brosur Ahad Pagi MTA...</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <span class="text-slate-500 font-bold select-none shrink-0">✓</span>
                    <span>Menelusuri perkembangan materi "shalat tahajud dan witir" (1995–2026)...</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <span class="text-slate-500 font-bold select-none shrink-0">✓</span>
                    <span>Mencari matan hadits 'Aisyah radhiyallahu 'anha tentang 11 rakaat...</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <span class="text-slate-500 font-bold select-none shrink-0">✓</span>
                    <span>Memeriksa keutuhan teks Arab, harakat, dan perawi hadits...</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <span class="text-slate-500 font-bold select-none shrink-0">✓</span>
                    <span>Menyusun penjelasan beserta rujukan terverifikasi...</span>
                  </div>
                </div>
              </details>

              <!-- Konten Jawaban Teks & Dalil Hadits -->
              <div class="text-[14px] sm:text-[15px] leading-[1.85] space-y-3">
                <p class="text-slate-700">
                  Berdasarkan penelaahan khazanah <strong>Brosur Ahad Pagi Majlis Tafsir Al Qur'an (MTA)</strong>, pelaksanaan shalat malam (tahajud) dan witir bersandar kuat pada hadits shahih yang diriwayatkan oleh Ummul Mukminin ‘Aisyah <em>radhiyallahu ‘anha</em>:
                </p>

                <!-- Box Teks Dalil Arab (Scheherazade New, RTL, Border Emerald) -->
                <div class="text-[19px] sm:text-[22px] leading-[2.3] text-right py-4 px-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl my-3 text-slate-900 font-arabic shadow-xs" dir="rtl">
                  مَا كَانَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ يَزِيدُ فِي رَمَضَانَ وَلَا فِي غَيْرِهِ عَلَى إِحْدَى عَشْرَةَ رَكْعَةً
                </div>

                <blockquote class="border-l-4 border-emerald-500 pl-4 py-1.5 my-2.5 bg-slate-50/80 rounded-r-xl italic text-slate-600 text-xs sm:text-sm">
                  "Rasulullah shallallahu 'alaihi wa sallam tidak pernah menambah shalat malam pada bulan Ramadhan maupun di luar Ramadhan lebih dari 11 rakaat." <strong>(HR. Bukhari no. 1147 & Muslim no. 738)</strong>
                </blockquote>

                <p class="text-slate-700">
                  Dalam tuntunan Brosur Ahad Pagi MTA, tata cara pelaksanaannya lazim dilakukan dengan format <strong>4 rakaat, 4 rakaat, kemudian ditutup 3 rakaat witir</strong> tanpa tasyahhud awal pada rakaat kedua witir, atau dapat pula dilakukan <strong>2 rakaat salam sebanyak 4 kali lalu diakhiri 1 atau 3 rakaat witir</strong>.
                </p>
              </div>

              <!-- Rujukan Brosur Terverifikasi (10–20 Rujukan Arsip) -->
              <details class="border border-emerald-200/80 rounded-2xl p-3.5 text-xs bg-emerald-50/30 font-sans shadow-xs group">
                <summary class="cursor-pointer text-slate-800 font-bold select-none flex items-center justify-between gap-2 hover:text-emerald-800">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Rujukan Dalil & Brosur Ahad Pagi (14 Rujukan Terverifikasi)</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                    10–20 Rujukan Arsip
                  </span>
                </summary>

                <div class="mt-3 pt-3 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div class="flex items-start gap-2.5 p-2 rounded-xl bg-white/90 border border-slate-200/70 text-[11.5px]">
                    <span class="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                    <div class="min-w-0">
                      <p class="font-bold text-slate-800 truncate">Tuntunan Shalat Malam & Shalat Lail</p>
                      <p class="text-[10.5px] text-slate-500">Arsip Tahun 2004 • Edisi 712</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-2.5 p-2 rounded-xl bg-white/90 border border-slate-200/70 text-[11.5px]">
                    <span class="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                    <div class="min-w-0">
                      <p class="font-bold text-slate-800 truncate">Kumpulan Dalil Shalat Witir dan Qiyamul Lail</p>
                      <p class="text-[10.5px] text-slate-500">Arsip Tahun 2018 • Edisi 1435</p>
                    </div>
                  </div>
                </div>
              </details>

              <!-- Tombol Salin Jawaban & Bagikan -->
              <div class="flex items-center gap-2 pt-2 text-[11px] border-t border-slate-100">
                <button class="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition font-medium cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  <span>Salin Jawaban</span>
                </button>
                <button class="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition font-medium cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  <span>Bagikan</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- 3. INPUT BAR FLOATING DI BAWAH (Fixed Bottom with Gradient Fade)          -->
      <!-- ========================================================================= -->
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-6 sm:pb-7 px-4 sm:px-6 z-20">
        <div class="max-w-3xl mx-auto">
          
          <form class="bg-slate-100/95 border border-slate-200/90 rounded-2xl p-2 flex items-center gap-2.5 focus-within:ring-4 focus-within:ring-emerald-500/15 focus-within:border-emerald-500 focus-within:bg-white transition-all shadow-md">
            <input
              type="text"
              placeholder="Tanyakan materi, dalil aqiqah, shalat, atau materi Brosur Ahad Pagi..."
              class="flex-1 bg-transparent border-none px-3.5 py-2.5 text-sm sm:text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer active:scale-95"
              title="Kirim Pertanyaan"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          <!-- Disclaimer Privasi & Khazanah -->
          <div class="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-2.5 font-medium">
            <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span>Menelusuri 10–20 rujukan arsip Brosur & Hadits MTA (1995–2026) • Tersimpan privat di perangkat Anda</span>
          </div>

        </div>
      </div>

    </main>

  </div>

</body>
</html>
```

