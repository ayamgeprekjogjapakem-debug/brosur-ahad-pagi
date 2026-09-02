import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch(query) {
  const { data, error } = await supabase.rpc('search_brosur_ranked', {
    search_query: query,
    filter_folder_id: null
  });
  console.log('Query:', query);
  if (error) console.error('Error:', error);
  else console.log('Results:', data.length);
}

testSearch('bismillah');
testSearch('hukum');
