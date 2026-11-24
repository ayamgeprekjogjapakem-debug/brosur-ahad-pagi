/**
 * Menghasilkan hash deterministik cepat untuk mendeteksi perubahan isi teks brosur
 * secara konsisten di sisi client maupun server.
 */
export function computeContentHash(text: string | null | undefined): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'empty';

  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `${normalized.length}_${combined.toString(36)}`;
}
