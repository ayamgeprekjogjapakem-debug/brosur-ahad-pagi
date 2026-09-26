import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function update() {
  const { error } = await supabase
    .from('app_settings')
    .update({ 
      openrouter_token: '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',
      ai_enabled: true
    })
    .eq('id', 1);
  if (error) console.error(error);
  else console.log('Token updated successfully!');
}
update();
