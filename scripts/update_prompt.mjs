import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePrompt() {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ 
      system_prompt: 'Gunakan gaya bahasa santun, poin-poin terstruktur, dan huruf tebal untuk menyorot dalil penting.' 
    })
    .eq('id', 1);

  if (error) {
    console.error('Error updating prompt:', error);
  } else {
    console.log('System prompt updated successfully.');
  }
}

updatePrompt();
