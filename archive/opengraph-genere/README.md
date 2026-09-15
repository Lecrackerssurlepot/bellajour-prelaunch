# La vignette de partage FABRIQUÉE — archivée le 15/09/2026

`src/app/opengraph-image.tsx` construisait l'image de partage à chaque appel, avec
`next/og` : deux polices téléchargées chez `fonts.googleapis.com`, deux images du
dossier `public/` relues et converties par sharp, et une composition en JSX.

## Pourquoi elle est ici

**1. Elle disait autre chose que ce qu'on vend.** Elle annonçait « Nous composons vos
photos en **albums** d'exception ». Le site vend un **magazine** depuis le 24/08/2026.
Un lien collé en message privé — le premier canal d'acquisition — promettait un album et
ouvrait un magazine. C'était le point 1 du ticket T-069, ouvert le 29/08.

**2. Elle ne montrait pas le produit.** Une illustration de calanque, alors que les
photographies des magazines imprimés existent depuis le 15/09.

**3. Elle pouvait faire échouer un déploiement.** Deux polices distantes et deux fichiers
lus au build. Le fichier portait déjà des replis (`null` en cas d'échec, ajoutés par
T-069), mais la dépendance restait : un ménage d'assets qui aurait déplacé
`header-bellajour.webp` faisait tomber la construction entière.

## Ce qui la remplace

`public/images/v2/partage/bellajour-magazines-1200.png`, une photographie des dix
magazines imprimés livrée par Mathias, déclarée en URL **absolue** dans
`src/app/layout.tsx`, `(atelier)/page.tsx` et `(atelier)/magazine/page.tsx`.

⚠️ **L'URL doit rester absolue.** Les robots d'aperçu ne résolvent pas les chemins
relatifs : un `/images/...` nu est ignoré et la vignette disparaît sans message d'erreur.

## Pour la rappeler

`git mv` en sens inverse. Elle n'a aucune autre dépendance que `next/og` et `sharp`,
tous deux toujours installés. ⚠️ Mais vérifier d'abord ce qu'elle raconte : sa phrase
était fausse le jour où elle a été archivée.
