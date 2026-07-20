// Membaca .env.local secara manual agar tidak bergantung pada dotenv
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}
// Ambil kredensial dari .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase URL dan Service Role Key tidak ditemukan di .env.local");
  console.error("Pastikan Anda sudah menempelkan SUPABASE_SERVICE_ROLE_KEY di .env.local Anda.");
  process.exit(1);
}

async function uploadData() {
  const brosurPath = path.join(__dirname, '..', 'data', 'brosur.json');
  const indexPath = path.join(__dirname, '..', 'data', 'index.json');
  
  if (!fs.existsSync(brosurPath)) {
    console.error("Error: File data/brosur.json tidak ditemukan!");
    process.exit(1);
  }

  console.log("Membaca file data/brosur.json... (Ukuran file mungkin besar, mohon tunggu)");
  const brosurData = JSON.parse(fs.readFileSync(brosurPath, 'utf8'));
  const indexData = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : [];
  
  console.log(`Berhasil membaca ${brosurData.length} entri brosur.`);
  
  // Create a map of slugs from index.json for fast lookup
  const slugMap = {};
  indexData.forEach(item => {
    slugMap[item.id] = item.slug;
  });

  console.log("Mulai mengunggah data ke Supabase...");
  
  // Menggunakan batch untuk mempercepat dan menghindari timeout
  const BATCH_SIZE = 50; 
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < brosurData.length; i += BATCH_SIZE) {
    const batch = brosurData.slice(i, i + BATCH_SIZE).map(item => {
      // Find slug from index.json map, or fallback to generating a slug
      const slug = slugMap[item.id] || item.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      return {
        id: item.id,
        tahun: item.tahun,
        judul: item.judul,
        slug: slug,
        konten: item.konten
      };
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/brosur?on_conflict=id`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error pada batch ${i} - ${i + BATCH_SIZE}:`, errorText);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      process.stdout.write(`\rProgres: ${Math.min(i + BATCH_SIZE, brosurData.length)} / ${brosurData.length} berhasil diunggah.`);
    }
  }

  console.log("\n\nSelesai!");
  console.log(`Berhasil: ${successCount} baris.`);
  if (errorCount > 0) {
    console.log(`Gagal: ${errorCount} baris.`);
  }
}

uploadData();
