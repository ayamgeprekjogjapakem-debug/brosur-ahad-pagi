import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('search_brosur_ranked', {
    search_query: 'adab',
    filter_folder_id: null
  });
  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("DB Data count:", data?.length);
  }
}
main();
