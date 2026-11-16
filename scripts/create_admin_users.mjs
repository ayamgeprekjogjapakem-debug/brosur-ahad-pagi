import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.brosurmta.my.id';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USERS = [
  {
    email: 'r.wariyanto@gmail.com',
    password: '123123',
    name: 'Rifqi Wariyanto',
    role: 'super-admin'
  },
  {
    email: 'brosurmta@gmail.com',
    password: '123123',
    name: 'Admin Brosur MTA',
    role: 'admin'
  }
];

async function main() {
  console.log(`Connecting to: ${SUPABASE_URL}...`);

  for (const u of USERS) {
    console.log(`\nCreating user via Supabase Auth Admin: ${u.email}...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        name: u.name,
        role: u.role
      }
    });

    if (error) {
      console.error(`Error creating ${u.email}:`, error.message);
    } else {
      console.log(`Success! User ID: ${data.user.id}`);

      // Upsert ke public.profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: u.email,
        name: u.name,
        role: u.role,
        is_active: true
      });

      if (profileError) {
        console.error(`Error updating profile for ${u.email}:`, profileError.message);
      } else {
        console.log(`Profile updated with role: ${u.role}`);
      }
    }
  }
}

main().catch(console.error);
