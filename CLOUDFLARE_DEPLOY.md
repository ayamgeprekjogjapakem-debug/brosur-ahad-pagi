# Panduan Deploy Next.js ke Cloudflare Pages

Panduan ini berisi langkah-langkah untuk mendeploy aplikasi **Brosur Ahad Pagi (Next.js)** ke **Cloudflare Pages**.

---

## 1. Hubungkan Repositori GitHub ke Cloudflare Pages

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Di menu navigasi kiri, pilih **Workers & Pages** -> **Create application** -> Tab **Pages**.
3. Pilih **Connect to Git** dan hubungkan akun GitHub Anda.
4. Pilih repositori: `brosur-ahad-pagi`.

---

## 2. Pengaturan Build (Build Settings)

Pada bagian **Set up builds and deployments**, konfigurasikan:

- **Framework preset**: `Next.js`
- **Build command**: `npx @cloudflare/next-on-pages` (atau `npm run pages:build`)
- **Build output directory**: `.vercel/output/static`
- **Root directory**: `/` (kosongkan / default)

---

## 3. Environment Variables (Variabel Lingkungan)

Pada bagian **Environment variables (advanced)**, tambahkan variabel berikut:

| Variable Name | Nilai (Value) | Keterangan |
| :--- | :--- | :--- |
| `NODE_VERSION` | `20` atau `22` | Versi Node.js yang digunakan saat build |
| `NEXT_PUBLIC_SUPABASE_URL` | *URL project Supabase Anda* | Contoh: `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Anon Key Supabase Anda* | Publik key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | *Service Role Key Supabase Anda* | Key server Supabase |
| `OPENROUTER_API_KEY` | *(Opsional)* | Token AI OpenRouter |
| `GOOGLE_GENERATIVE_AI_API_KEY` | *(Opsional)* | Token Google Gemini AI |

> [!NOTE]
> Pastikan variabel `NODE_VERSION` diset minimal `20` agar kompatibel dengan Next.js 15/16 dan React 19.

---

## 4. Compatibility Flags

Di Cloudflare Dashboard:
1. Buka project Pages Anda -> **Settings** -> **Functions**.
2. Di bagian **Compatibility flags**, pastikan terdapat:
   - `nodejs_compat`
3. Simpan pengaturan.

---

## 5. File Konfigurasi yang Tersedia di Proyek
- [wrangler.toml](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/wrangler.toml): Konfigurasi runtime Cloudflare Workers / Pages.
- [.env.example](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/.env.example): Contoh variabel lingkungan yang wajib disalin ke Cloudflare dashboard.
- [package.json](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/package.json): Berisi script `pages:build` dan `preview`.
