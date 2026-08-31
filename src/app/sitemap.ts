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
/* PAS de `lastModified`, et c'est un choix (T-014, 31/08/2026).
   `new Date()` a chaque build est un mensonge evident ; des constantes ecrites
   a la main sont un mensonge lent — elles ne bougent que si quelqu'un y pense,
   et elles derivaient deja (l'accueil refondu date du 28/08, la constante
   disait le 27). Les deriver de git au build est fragile sur Vercel (clone
   superficiel : la date rendue serait celle du dernier commit visible, pas du
   dernier vrai changement). Un `lastmod` faux apprend a Google a l'ignorer,
   y compris le jour ou une page changera vraiment : un champ absent vaut
   mieux qu'un champ faux. Sur six URL, Google recrawle tres bien sans. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.bellajour.fr',
      changeFrequency: 'weekly',
      priority: 1,
    },
    /* La page produit. Elle porte le prix, le papier, le delai et la FAQ :
       c'est elle qui repond a une recherche « magazine photo personnalise »,
       pas l'accueil, qui raconte la marque. Priorite juste sous l'accueil. */
    {
      url: 'https://www.bellajour.fr/magazine',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.bellajour.fr/cgv',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.bellajour.fr/confidentialite',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.bellajour.fr/mentions-legales',
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    /* La quatrieme page legale. Elle repond 200, elle est indexable, elle a
       son canonical et elle est liee depuis le pied de page de l'accueil :
       elle etait simplement oubliee ici. */
    {
      url: 'https://www.bellajour.fr/remboursement',
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]
}
