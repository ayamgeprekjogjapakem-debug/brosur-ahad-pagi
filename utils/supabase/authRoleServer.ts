import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { AppRole, isMasterSuperAdminEmail, normalizeRole } from '@/utils/authRoles';

export interface ResolvedUserAccess {
  role: AppRole;
  rawRole: string;
  isActive: boolean;
}

/**
 * Mengambil role & status aktif user dari tabel profiles menggunakan Admin Client
 * (aman dari RLS) dengan fallback email, user_metadata, dan daftar master superadmin.
 */
export async function resolveServerUserAccess(user: User): Promise<ResolvedUserAccess> {
  const isMaster = isMasterSuperAdminEmail(user.email);
  let profile: { role?: string | null; is_active?: boolean | null } | null = null;

  try {
    const adminSupabase = createAdminClient();
    const { data: byId } = await adminSupabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    profile = byId;

    if (!profile && user.email) {
      const { data: byEmail } = await adminSupabase
        .from('profiles')
        .select('role, is_active')
        .eq('email', user.email)
        .maybeSingle();
      profile = byEmail;
    }
  } catch (err) {
    console.warn('Warning resolving profile via admin client:', err);
  }

  const rawRole = isMaster
    ? 'superadmin'
    : (profile?.role || (user.user_metadata?.role as string) || 'user');

  const role: AppRole = isMaster ? 'superadmin' : normalizeRole(rawRole);
  const isActive = isMaster || (profile ? profile.is_active !== false : true);

  return { role, rawRole, isActive };
}
