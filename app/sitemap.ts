import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  
  // Ambil semua brosur dari database
  const { data: brosurs } = await supabase
    .from('brosur')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false });
  
  const baseUrl = 'https://brosurmta.vercel.app'; // Ganti dengan URL asli Anda

  const brosurUrls = brosurs?.map((brosur) => ({
    url: `${baseUrl}/${brosur.slug}`,
    lastModified: new Date(brosur.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  })) || [];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...brosurUrls,
  ]
}
