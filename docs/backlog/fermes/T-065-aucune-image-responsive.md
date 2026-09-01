---
id: T-065
titre: Aucune image du site n'a de variante pour téléphone
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
Grep exhaustif sur toute la surface publique (`(atelier)/`, `numero/`) : **zéro `srcset`, zéro
`sizes`**. Conséquence directe de la règle « zéro `next/image` », qui reste juste — mais rien ne
l'a remplacée.
Trois cas mesurés :
- `Ouverture.tsx:211` — `brand-01.webp` servie en **1200×1600, variante unique**. Décodée, elle
  occupe **7,3 Mo de mémoire bitmap**, et `ouverture.css:150` lui applique en plus un filtre plein
  écran qui exige un tampon supplémentaire. Sur un iPhone d'entrée de gamme avec plusieurs onglets,
  Safari recharge l'onglet : la visiteuse retombe sur l'écran noir de l'ouverture et recommence.
- `Corps.tsx:109,111` — deux sources 450×675 (116 Ko) peintes dans des cases d'environ 145×109 px,
  `aria-hidden`, purement décoratives : 2,4 Mo de bitmap pour deux timbres-poste.
- `Nav.tsx:94,110` — `signature-blanche.webp` en 320×122 affichée à 20 px de haut, préchargée et
  en `decoding="sync"` (décodage sur le fil principal), en concurrence avec l'image principale.
## Ce que propose
Des variantes et un `srcset` sur les trois cas, en commençant par la couverture qui est aussi
l'image principale. `scripts/optimize-images.mjs` sait déjà fabriquer les déclinaisons.
Commencer par `decoding="async"` sur la signature : une ligne, gain immédiat.
## Ce qui a été fait
**30/08** — la couverture : `brand-01` a ses variantes 640/960, `srcset`/`sizes="100vw"` posés
dans `Ouverture.tsx` (miroir du `<link rel="preload">` de `page.tsx`). La signature de la nav est
passée en `decoding="async"`.

**31/08** — la galerie et les timbres :
- `scripts/images-galerie.mjs` (nouveau, modèle `images-univers.mjs`) : variantes -240/-360 (q75)
  pour les 6 fichiers réellement référencés par un srcset (marrakech, japon, patagonie, lisbonne,
  santorin, tulum). Les 25 originaux 450×675 restent intacts : ils sont le PLAFOND du srcset
  (iPhone 3x : 38vw ≈ 143 px CSS × 3 = 428 px — le 450 est la bonne taille là) et servent seuls
  partout où aucun srcset n'est posé.
- `Univers.tsx` : les 10 `<figure>` du rail (5 + 5 copies aria-hidden) portent
  `srcset 240/360/450` + `sizes="(max-width: 1000px) 38vw, 15vw"` (les seuils réels d'univers.css).
  Refactor en map — DOM prouvé identique dans le HTML pré-rendu (ordre, légendes, alt, aria-hidden).
- `Corps.tsx:109-111` : les deux timbres portent le même srcset + `sizes="10vw"`.
- **Non touchés, et pourquoi** : le numéro de la section 07 de l'accueil (26vw bureau / 52vw
  mobile : peint PLUS GRAND que 450 dès 2x, une variante plus petite ne serait jamais choisie) ;
  les 3 couvertures du Kiosque de /magazine (peintes ~290 px CSS × 2 = 580 > 450 : déjà sous la
  taille utile) ; l'OG image et le preload de /magazine (450 plein cadre).

Vérifié au navigateur (build prod, port 3005) : à 375 px/dpr 2, le rail charge `*-360.webp`
(currentSrc) et s'affiche proprement, défilement intact — capture faite. Les timbres chargent
`tulum-360/lisbonne-360` à 900 et 1440 px, `-240` sous 720 px, et restent non téléchargés au
chargement initial quand ils sont `display:none`. ⚠️ Piège rencontré : `next start` déjà lancé
404 sur les fichiers `public/` ajoutés après son démarrage — redémarrer le serveur après avoir
généré des variantes.

Reste (hors périmètre du 31/08) : la galerie basse de l'accueil n'existe pas (le rail EST la
galerie), rien d'autre à décliner tant qu'un nouvel usage n'apparaît pas.
