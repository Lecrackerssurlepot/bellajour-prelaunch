import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: 'https://www.bellajour.fr',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://www.bellajour.fr/preventes',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://www.bellajour.fr/preventes/prix',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: 'https://www.bellajour.fr/confidentialite',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
