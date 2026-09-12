import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/'], // Sembunyikan halaman dashboard/admin
    },
    sitemap: 'https://brosurmta.vercel.app/sitemap.xml',
  }
}
