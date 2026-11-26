import type { MetadataRoute } from 'next'
import { legalLanguages } from './legal/resolve'
import { CGV } from './legal/content/cgv'
import { CONFIDENTIALITE } from './legal/content/confidentialite'
import { MENTIONS_LEGALES } from './legal/content/mentions-legales'
import { REMBOURSEMENT } from './legal/content/remboursement'
import { LIVRAISON } from './legal/content/livraison'
import { visuelPour, type NomEmplacement } from '@/content/media'

/* Les emplacements de contenu de chaque page (jamais un décor). */
const ACCUEIL: NomEmplacement[] = [
  'accueil.couverture', 'accueil.couverture-2', 'accueil.couverture-3', 'accueil.couverture-4',
  'accueil.couverture-5', 'accueil.double-page-1', 'accueil.double-page-2', 'accueil.photo-exemple',
]
const MAGAZINE: NomEmplacement[] = ['magazine.couverture', 'magazine.eventail-2', 'magazine.eventail-3', 'magazine.double-page']
function imagesDe(noms: NomEmplacement[]): string[] {
  const urls = noms.map((n) => visuelPour(n)?.fichier).filter((f): f is string => Boolean(f)).map((f) => `https://www.bellajour.fr${f}`)
  return [...new Set(urls)]
}

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
      /* ── LES IMAGES DE LA PAGE, DÉCLARÉES (15/09/2026) ──
         Un plan de site accepte une liste d'images par URL, et c'est ce qui
         les fait exister dans Google Images — un canal d'entrée que le texte
         seul n'ouvre pas, sur un produit qui se vend par l'oeil.
         ⚠️ On ne déclare QUE des images de contenu, jamais un décor. Les
         vignettes de la page 02 en sont donc absentes : elles illustrent un
         propos sur les réseaux sociaux, elles ne montrent pas le produit.
         ⚠️ Chemins ABSOLUS : Google refuse les relatifs ici. Ils suivent les
         noms produits par scripts/images-v2.mjs — s'ils changent, cette liste
         change avec eux. */
      /* Les images de contenu de la page, LUES dans la librairie (media.ts) :
         ce que Google indexe est ce que la page montre ce jour-là. */
      images: imagesDe(ACCUEIL),
    },
    /* La page produit. Elle porte le prix, le papier, le delai et la FAQ :
       c'est elle qui repond a une recherche « magazine photo personnalise »,
       pas l'accueil, qui raconte la marque. Priorite juste sous l'accueil. */
    {
      url: 'https://www.bellajour.fr/magazine',
      changeFrequency: 'monthly',
      priority: 0.9,
      /* La page qui répond à « magazine photo personnalisé » déclare ses
         quatre images de produit — les trois du collage et la double page.
         La cinquième, `magazine-photo-personnalise-1600`, n'est pas ici : elle
         n'est affichée nulle part, elle vit dans le JSON-LD `Product.image`,
         qui est le bon endroit pour elle. */
      images: imagesDe(MAGAZINE),
    },
    /* La page des écoles et associations (brochure, rendez-vous). */
    {
      url: 'https://www.bellajour.fr/partenaires',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    /* T-083 — chaque page legale existe en fr, en et pt, sur des adresses
       distinctes (`/cgv`, `/en/cgv`, `/pt/cgv`). On declare la famille par
       `alternates.languages` (hreflang, x-default sur le francais) : la version
       portugaise, qui fait foi, devient indexable et rattachee aux autres. Une
       seule entree par document, l'URL francaise en tete. */
    {
      url: 'https://www.bellajour.fr/cgv',
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: { languages: legalLanguages('cgv', CGV) },
    },
    {
      url: 'https://www.bellajour.fr/confidentialite',
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: { languages: legalLanguages('confidentialite', CONFIDENTIALITE) },
    },
    {
      url: 'https://www.bellajour.fr/mentions-legales',
      changeFrequency: 'yearly',
      priority: 0.2,
      alternates: { languages: legalLanguages('mentions-legales', MENTIONS_LEGALES) },
    },
    /* La quatrieme page legale. Elle repond 200, elle est indexable, elle a
       son canonical et elle est liee depuis le pied de page de l'accueil :
       elle etait simplement oubliee ici. */
    {
      url: 'https://www.bellajour.fr/remboursement',
      changeFrequency: 'yearly',
      priority: 0.2,
      alternates: { languages: legalLanguages('remboursement', REMBOURSEMENT) },
    },
    /* La page Livraison (16/09/2026) : zones, seuil, delais. Meme famille que
       les quatre autres, trois langues, portugais qui fait foi. */
    {
      url: 'https://www.bellajour.fr/livraison',
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: { languages: legalLanguages('livraison', LIVRAISON) },
    },
  ]
}
