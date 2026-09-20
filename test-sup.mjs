import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbdvcwjdttcjirrsgwsj.supabase.co';
const supabaseKey = 'sb_publishable_Mpf4AtQtblWyhe2KTWjrrA_vfAV0SBQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing insert...");
  const payload = {
    kitab: 'bukhari',
    nomor: 999999, // dummy number
    teks_arab: 'test',
    terjemahan: 'test',
    sumber_api: 'test'
  };

  const { data, error } = await supabase
    .from('master_hadist_api')
    .upsert([payload], { onConflict: 'kitab,nomor', ignoreDuplicates: true });

  if (error) {
    console.error("SUPABASE ERROR:", error);
    console.log("STRINGIFIED ERROR:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
  } else {
    console.log("SUCCESS! Data:", data);
  }
}

testInsert();
