import type { MetadataRoute } from 'next'

/* Le plan du site, refait à la bascule du 24/08/2026.
 *
 * N'y figure QUE ce qu'on veut voir apparaître dans une recherche :
 *   — `/` : la homepage, qui est désormais l'Atelier ;
 *   — les pages légales, que Google aime trouver et qui rassurent.
 *
 * Volontairement ABSENTS :
 *   — `/preventes`, `/preventes/prix` et `/lancement` : RETIRÉES le 28/08/2026.
 *     Elles étaient déjà absentes d'ici (noindex à la clôture) ; elles
 *     répondent désormais une 307 vers `/`. Rien à changer, et surtout rien
 *     à y remettre.
 *   — `/composer` : un questionnaire à six écrans n'a rien à faire dans un
 *     résultat de recherche, il n'a de sens qu'après la page d'accueil.
 *   — `/numero/[token]` : chaque adresse est un secret. La lister
 *     reviendrait à publier les dossiers de toutes les clientes.
 *   — `/atelier` : n'existe plus que comme redirection 308 vers `/`.
 */
/* Des dates REELLES, pas `new Date()`. Un sitemap qui declare toutes ses
   pages modifiees a la seconde de la requete apprend a Google que son
   `lastmod` ne veut rien dire — y compris le jour ou une page changera
   vraiment. A remettre a jour quand on touche a la page concernee. */
const MAJ_ACCUEIL = new Date('2026-08-27')   // refonte de l'accueil
const MAJ_LEGALES = new Date('2026-08-24')   // bascule + CGV v3.0

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.bellajour.fr',
      lastModified: MAJ_ACCUEIL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://www.bellajour.fr/cgv',
      lastModified: MAJ_LEGALES,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.bellajour.fr/confidentialite',
      lastModified: MAJ_LEGALES,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.bellajour.fr/mentions-legales',
      lastModified: MAJ_LEGALES,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    /* La quatrieme page legale. Elle repond 200, elle est indexable, elle a
       son canonical et elle est liee depuis le pied de page de l'accueil :
       elle etait simplement oubliee ici. */
    {
      url: 'https://www.bellajour.fr/remboursement',
      lastModified: MAJ_LEGALES,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]
}
