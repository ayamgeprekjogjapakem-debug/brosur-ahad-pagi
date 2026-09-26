import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('hadist_brosur')
    .select('terjemahan, catatan')
    .or('terjemahan.ilike.%aisyah%,catatan.ilike.%aisyah%')
    .limit(5);
  
  if (error) console.error(error);
  else console.log('Aisyah:', data.length);
  
  const { data: cacheData, error: cacheErr } = await supabase.from('search_intent_cache').select('*');
  console.log('Cache contents:', cacheData);
}
check();
