import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDel() {
  console.log("Fetching one brosur...");
  const { data: brosur } = await supabase.from('brosur').select('id').limit(1);
  if (!brosur || brosur.length === 0) return console.log("No brosur found.");
  
  const id = brosur[0].id;
  console.log("Trying to delete brosur ID:", id);
  
  const { error, data } = await supabase.from('brosur').delete().eq('id', id).select();
  console.log("Delete result data:", data);
  if (error) {
    console.error("Delete error:", error);
  } else if (data && data.length === 0) {
    console.log("No error, but 0 rows deleted. RLS issue?");
  }
}
checkDel();
