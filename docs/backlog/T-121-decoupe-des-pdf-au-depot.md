---
id: T-121
titre: La fiche doit recouper elle-même l'export Canva en pages d'impression, l'atelier ne peut pas passer par un script à chaque dossier
etat: en cours
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-18
---
## Ce que Mathias a dit
« Mais par contre cela sera à l'atelier de faire les vérifications et les découpes car on ne va
pas passer par toi pour chaque dossier c'est une trop grosse perte de temps. »

Et avant : « Mais si j'envoie à l'atelier le pdf couverture et le PDF des doubles pages il est
capable de faire les découpes par rapport au produit on est d'accord ? » (Réponse : non, rien ne
découpe aujourd'hui.)

## Ce que j'ai vérifié
Sur le premier dossier réel (Merisa, « Madeira 2026 », 44 pages, 18/09/2026) :
- L'export Canva « PDF pour impression » avec « Traits de coupe et fond perdu » donne un fichier
  de 24 pages : la couverture (double), une page simple, 21 doubles, une page simple. Chaque page
  porte une TrimBox exacte (419,89 × 297,13 ou 210,08 × 297,13 mm) et 6 mm de marge autour
  (3 mm de fond perdu rempli d'image, puis 3 mm de marge blanche avec les traits de coupe).
- La fiche (`/api/admin/atelier/impression/presign` + `controle`) signe un PUT direct vers R2 et
  MESURE le fichier déposé (MediaBox, TrimBox, nombre de pages, verdicts de `impression.ts`).
  Elle ne transforme rien : un export en doubles pages part tel quel chez Cloudprinter, avec
  `total_pages = 44` en paramètre, ce qui serait faux.
- La découpe a été faite à la main par un script pypdf (session du 18/09) : pour chaque page,
  lire la TrimBox ; page simple → une page ; double → deux pages coupées au milieu de la TrimBox ;
  chaque page finale = MediaBox/CropBox/BleedBox de 216 × 303 mm centrée sur son fini, TrimBox
  210 × 297. Aucun re-rendu : les mêmes objets, seules les boîtes changent. Résultat : 44 pages,
  verdicts « conforme » sur format, compte et multiple ; fond perdu rempli sur 44 pages × 4 bords
  (un seul coin blanc de 2,9 mm côté couture, page 36).
- La couverture suit la même logique : design Canva de 423,29 × 297 mm (2 × 210 + dos de
  3,29 mm), export avec fond perdu, recoupe à 429,29 × 303 (`largeurCouvertureMm`). Le gabarit
  officiel a DEUX pages (extérieur + intérieur, dos + 3 mm vierges à l'intérieur).

## Ce que je propose
Faire la découpe DANS LE NAVIGATEUR de l'atelier, avant le dépôt (pdf-lib est déjà une
dépendance du projet ; un PDF de 130 Mo n'a rien à faire dans une fonction serverless, règle
de `presign/route.ts`). Le geste de l'atelier devient : déposer l'export Canva tel quel.

1. **Module pur `decoupe.ts`** (`src/lib/atelier/`) : à partir de la liste des pages (largeur et
   hauteur de TrimBox, MediaBox), décide pour chaque page « simple », « double » ou « couverture »,
   produit la liste des boîtes de sortie (216 × 303 centrées, ou 429,29 × 303 pour la couverture),
   et le compte de pages attendu. Refus lisibles : page sans fond perdu (TrimBox = MediaBox),
   largeur qui n'est ni 210 ni 420 ni la largeur de couverture, compte impair. Au harnais.
2. **Dans `PanneauAction.tsx`**, avant `televerserPdf` : ouvrir le fichier avec pdf-lib, appliquer
   les boîtes de `decoupe.ts` (copie des pages, `setMediaBox` / `setCropBox` / `setBleedBox` /
   `setTrimBox`), sauver, puis déposer LE FICHIER PRODUIT (single-part, md5 = ETag, inchangé).
   L'écran montre ce qu'il a fait : « 24 pages Canva → 44 pages d'impression », et le verdict du
   contrôle existant s'applique au fichier produit. Un fichier déjà au bon format passe tel quel.
3. **La couverture** : même chemin, sortie 429,29 × 303 ; si l'export a une seule page, en ajouter
   une vierge (le gabarit en attend deux) ; sur décision de Mathias.
4. **Ne pas casser** : `verdictTaillePage`, `verdictPagesPdf`, `MAX_PDF_BYTES` restent la source du
   verdict ; le dépôt reste single-part ; aucune route serveur ne reçoit le PDF.

5. **Bloquer, pas seulement annoncer** : aujourd'hui `envoyer_impression` ne lit pas les verdicts du
   contrôle (`transition/route.ts` vérifie présence et md5, pas `verdictTaillePage`). Un fichier
   `hors_format` ou au mauvais compte de pages doit rendre 422 avec la phrase du contrôle : un
   export Canva brut (222 × 309) partirait sinon chez Cloudprinter avec sa marge blanche.
6. **Résolution des photos posées, au dépôt** (demande de Mathias du 18/09) : pour chaque image du
   PDF, largeur en pixels / largeur posée en mm (chaîne complète des transformations, comme le
   relevé pypdfium2 du 18/09 : pleines pages de Merisa à 171 dpi, vignettes 300 à 500), et la
   liste des pages sous un seuil réglable. Dans le navigateur (pdf.js donne les opérateurs et
   leurs matrices), jamais sur le serveur.
7. **Bien plus tôt, sur la fiche du dossier** : signaler les photos trop petites pour une pleine
   page dès le dépôt du client (les dimensions sont connues : `photos`), avec le dpi qu'elles
   donneraient en A4. C'est là que l'atelier choisit quoi agrandir, pas au moment d'imprimer.

Rattaché à T-078 (le moteur de rendu) dont c'est l'étape 1 concrète, avec le dossier de Merisa
comme jeu d'essai (les fichiers du 18/09 sont sur le Bureau de Mathias).

## Ce qui a été fait
**18/09/2026 (soir), PR #181 fusionnée le jour même. Décision de Mathias : « c'est à l'atelier de
créer les fichiers en pages simples et d'ajouter le dos aux bonnes mesures ».**
- Points 1 à 5 livrés : `src/lib/atelier/decoupe.ts` (pur, 40 cas au harnais sur les cotes réelles
  de l'export de Merisa), `src/app/admin/atelier/[token]/preparerPdf.ts` (pdf-lib, dans le
  navigateur, appelé par `televerserPdf` avant le presign), `src/lib/atelier/controlePdf.ts`
  (l'inspection extraite de la route de contrôle) et la transition qui relit chaque PDF du coffre et
  rend 422 sur un format faux, dry-run compris ; le récap du dry-run porte une ligne « Mesuré ».
- Éprouvé sous Node sur les fichiers de Merisa : « Douples pages » (23 pages) → 44 pages de 216 × 303
  en 0,5 s, « Cover » (420 mm) → 429,29 × 303 avec le dos de 3,29 mm, résultats identiques au pixel
  près aux fichiers faits à la main le matin ; l'export sans fond perdu est refusé avec la case
  Canva à cocher dans la phrase.
- tsc, lint, build, harnais (1143 cas) verts. Dry-run complet rejoué sur le build local avec les deux
  exports Canva bruts de Merisa injectés dans la fiche : les deux cadres disent ce qu'ils ont fait, le
  récap porte « Mesuré : cover 2 pages de 429,3 × 303 · book 44 pages de 216 × 303, conforme ».
- Points 6 et 7 (résolution des photos) : pas commencés.
Reste : le dépôt à l'œil sur la vraie fiche de Merisa, avec les deux exports Canva bruts.

