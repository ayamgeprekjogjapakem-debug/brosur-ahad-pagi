import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function generateCleanSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Ganti karakter non-alphanumeric dengan dash
    .replace(/^-+|-+$/g, '');    // Hapus dash di awal dan akhir
}

async function run() {
  const { data, error } = await supabase.from('brosur').select('id, judul, slug');
  if (error) {
    console.error(error);
    return;
  }
  
  let updated = 0;
  for (const brosur of data) {
    const cleanSlug = generateCleanSlug(brosur.judul);
    if (brosur.slug !== cleanSlug) {
      const { error: updateErr } = await supabase.from('brosur').update({ slug: cleanSlug }).eq('id', brosur.id);
      if (updateErr) console.error("Error updating", brosur.judul, updateErr);
      else {
        console.log(`Updated: ${brosur.slug} -> ${cleanSlug}`);
        updated++;
      }
    }
  }
  console.log(`Finished updating ${updated} slugs.`);
}
run();
