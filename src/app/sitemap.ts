import type { MetadataRoute } from 'next'

/* Le plan du site, refait à la bascule du 24/08/2026.
 *
 * N'y figure QUE ce qu'on veut voir apparaître dans une recherche :
 *   — `/` : la homepage, qui est désormais l'Atelier ;
 *   — les pages légales, que Google aime trouver et qui rassurent.
 *
 * Volontairement ABSENTS :
 *   — `/preventes` et `/preventes/prix` : passés en noindex à la clôture.
 *     Un sitemap qui liste une page noindex envoie deux signaux
 *     contradictoires ; on ne garde qu'un seul.
 *   — `/composer` : un questionnaire à six écrans n'a rien à faire dans un
 *     résultat de recherche, il n'a de sens qu'après la page d'accueil.
 *   — `/numero/[token]` : chaque adresse est un secret. La lister
 *     reviendrait à publier les dossiers de toutes les clientes.
 *   — `/atelier` : n'existe plus que comme redirection 308 vers `/`.
 */
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
      url: 'https://www.bellajour.fr/cgv',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.bellajour.fr/confidentialite',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.bellajour.fr/mentions-legales',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]
}
