import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testDelete() {
  const { data, error } = await supabase
    .from('brosur')
    .delete()
    .eq('folder_id', 'ce7a695d-222a-4469-81bc-5d9c57502c46') // Dummy ID
    .select('id');
  console.log(error || 'Success');
}
testDelete();
