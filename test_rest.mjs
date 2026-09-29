async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  });
  
  const json = await res.json();
  console.log('Tables:', Object.keys(json.definitions || {}));
}
check();
