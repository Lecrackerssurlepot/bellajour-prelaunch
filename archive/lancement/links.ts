/* ════════════════════════════════════════════════════════════
   LANCEMENT — Destinations des liens d'action (SOURCE UNIQUE)
   Le tunnel de conception et l'espace compte n'existent pas encore :
   toutes les actions pointent sur '#' en attendant. Brancher ici
   (une ligne par lien) le jour où les routes existent — aucun
   composant ne code une destination en dur.
   ════════════════════════════════════════════════════════════ */

/* CTA principal « Concevoir mon album » (navbar, hero, parcours, avis). */
export const CTA_HREF = '#'

/* « Connexion » (navbar). */
export const LOGIN_HREF = '#'

/* Page produit (PDP). Tant que ça vaut '#', tous les liens qui en
   dépendent ne se rendent pas — jamais de lien mort. UNE ligne à changer
   le jour où la route existe : la barre d'annonce devient cliquable et le
   lien sous la galerie apparaît, tout seuls.
   (Type string explicite pour que les comparaisons !== '#' restent
   signifiantes pour TypeScript.) */
export const PDP_HREF: string = '#'

/* Lien éditorial sous la galerie. Mène à la PDP, ancrée sur sa section 2
   (l'illustration). Comportement attendu côté PDP : on arrive EN HAUT de
   la page (le header produit est vu en premier), puis la page glisse
   d'elle-même jusqu'à #illustration. C'est la PDP qui portera ce
   comportement (scroll doux au montage si location.hash === '#illustration'),
   pas ce lien. */
export const COVER_STORY_HREF =
  PDP_HREF === '#' ? '#' : `${PDP_HREF}#illustration`
