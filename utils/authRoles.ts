export type AppRole = 'superadmin' | 'admin' | 'user';

export const MASTER_SUPERADMIN_EMAILS = [
  'admin@brosurmta.com',
  'r.wariyanto@gmail.com',
  'test_admin@brosur.id',
  'brosurmta@gmail.com',
];

/**
 * Menormalkan berbagai penulisan role di database/metadata
 * ('super-admin', 'superadmin', 'super_admin' -> 'superadmin'; 'admin' -> 'admin'; lainnya -> 'user').
 */
export function normalizeRole(rawRole: unknown): AppRole {
  if (typeof rawRole !== 'string') return 'user';
  const r = rawRole.trim().toLowerCase();
  if (r === 'superadmin' || r === 'super-admin' || r === 'super_admin') {
    return 'superadmin';
  }
  if (r === 'admin') {
    return 'admin';
  }
  return 'user';
}

export function isMasterSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return MASTER_SUPERADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function getHomePathForRole(role: AppRole): string | null {
  if (role === 'superadmin') return '/dashboard';
  if (role === 'admin') return '/admin';
  return null;
}
