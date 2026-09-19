export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[']/g, '') // Remove apostrophes (e.g. Al-A'raf -> al-araf)
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens
}
