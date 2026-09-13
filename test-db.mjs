import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data } = await supabase
    .from('brosur')
    .select('konten')
    .ilike('slug', '%20260315-shalat-ied%')
    .limit(1)
    .single();
    
  if (data) {
    console.log(data.konten.substring(0, 1000));
  } else {
    console.log("Not found");
  }
}
main();
