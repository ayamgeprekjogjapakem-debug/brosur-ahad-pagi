import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('brosur').select('tahun');
  if (error) console.error(error);
  else {
    const years = [...new Set(data.map(d => d.tahun))].sort((a,b)=>b-a);
    console.log("YEARS IN DB:", years);
  }
}
run();
