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

   ⚠️ **LES QUATRE PIÈGES DU POINT 6, mesurés le 23/09/2026 sur le PDF réel de Lara.** Ils ne
   se devinent pas, et le premier m'a fait annoncer 43 dpi là où il y en avait 147.
   - **Ne compter QUE la face.** Une page issue d'une double porte DEUX morceaux : la face à
     l'échelle 1,000 et la réserve côté couture étirée (3,453× sur ce fichier). La bande contient
     les MÊMES images, vues à travers un facteur 3,45 : les compter divise tous les dpi par 3,45.
     Le filtre est simple, ne descendre que dans le morceau posé à l'échelle 1,000.
   - **Descendre récursivement.** Les images sont imbriquées dans des Form XObject sur plusieurs
     niveaux (page → `EmbeddedPdfPage-*` → `X8` → `X4`), et il faut multiplier à chaque étage la
     matrice `cm` du flux ET la `Matrix` du form.
   - **Une image de double est vue deux fois**, une fois par demi-page. Dédoublonner, ou dire que
     le compte est en placements et pas en photos.
   - **Un `q`/`Q` mal empilé fausse tout** : la pile des matrices doit être tenue, pas approchée
     par la dernière `cm` avant le `Do`.

   Seuils proposés, à confirmer par Mathias parce que ce sont des promesses de qualité et pas un
   réglage technique : 300 dpi l'idéal, 200 dpi le plancher, alerte sous 200. Sur Lara, onze
   placements étaient sous 200 dpi et un seul sous 150 (768 × 1024 px posé sur 132 mm, 147 dpi) ;
   la médiane était à 345 dpi. Le module de calcul doit être PUR et éprouvé au harnais, comme
   `bords.ts`, le rendu seul restant dans le navigateur.

8. **Signaler une photo AGRANDIE PAR LOGICIEL** (constat du 23/09/2026, utile et pas prévu).
   Un dpi élevé ne prouve plus rien depuis que Canva propose « améliorer l'image » : la fonction
   ré-échantillonne le fichier, donc le dpi affiché monte sans que le détail suive. Mesuré sur
   Lara, à la variance du laplacien, en ramenant chaque image au même format pour comparer :
   - la photo faible (768 px) agrandie par Canva à 2151 px rend **167**, contre **12** pour un
     agrandissement lanczos ordinaire et **392** pour une vraie photo native. Canva reconstruit
     donc du détail, ce n'est pas une simple interpolation, mais il en rend **43 %**.
   - ⚠️ et sur une photo qui allait DÉJÀ bien (3024 px, 336 dpi), passée à 3674 px, la netteté
     tombe de **306 à 207 une fois ramenée au format d'origine, soit −32 % de détail fin**.
     « Améliorer » une photo déjà bonne la DÉGRADE, et alourdit le fichier (81,9 → 92,1 Mo).
   Un simple rapport netteté/résolution suffirait à lever le doute et à dire à l'atelier : celle-ci
   est agrandie, ne comptez pas son dpi pour argent comptant.

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

**18 et 19/09/2026, PR #182, #183, #185, #186 (fusionnées, EN PROD).**
- #182 : lien « Voir le PDF préparé » sous chaque cadre (URL de lecture signée une heure).
- #183 : l'intérieur de couverture (page 2 du gabarit) laisse le dos et 3 mm de chaque côté vierges.
- #185 : décision de Mathias (« je ne veux absolument pas que cela se reproduise ») : la réserve de
  3 mm côté couture d'une page simple est le PROPRE bord de la page, étiré, jamais la page voisine.
- #186 : la face s'arrête 0,4 mm avant le pli (les photos Canva débordent la coupe centrale de
  0,2 mm et laissaient un filet sombre à 3 mm du bord) ; creux mesuré 140 → 5.
- Fichiers finaux du 19/09 (coffre, 14:04 UTC) vérifiés : conformes, sans filet, identiques aux
  builds de référence. Audit de géométrie complet : une seule remarque, page 36, fond perdu de
  2,2 mm en bas.

**21/09/2026, PR #187 fusionnée et EN PROD le jour même : le contrôle des bords, dans la fiche, au
dépôt (Mathias, 19/09 : « l'atelier devrait nous donner l'info »).**
- `src/lib/atelier/bords.ts` (pur, au harnais, 12 cas) : sur une page RENDUE en gris, pour chaque
  bord, si une photo touche la coupe (pixels < 245 dans le millimètre intérieur) et jusqu'où elle
  déborde dans le fond perdu, en s'arrêtant au PAPIER (≥ 254), pas au presque blanc d'une photo
  claire ; un débord court ne compte que s'il tient sur 2 mm de bord d'un seul tenant ; la phrase
  dit où (« vers la droite », « au milieu », « sur toute la largeur ») et sur combien de mm.
  Seuil : 2,5 mm. Le « presque » (une image qui s'arrête entre 0,3 et 3 mm avant la coupe) est
  signalé aussi.
- `src/app/admin/atelier/[token]/rendreBords.ts` : pdf.js rend chaque page à 100 dpi sur un canvas
  hors écran, dans le navigateur, sur les octets ENVOYÉS ; pdf.js et son worker sont copiés dans
  `public/pdfjs/` et chargés à l'exécution (hors bundler). `PanneauAction.tsx` lance le contrôle
  juste après le PUT, affiche « Contrôle des bords : page i sur n… » puis le résumé et les
  remarques sous le cadre (`.ate-bords`).
- Banc headless (Chrome, sur le build local, fichiers réels de Merisa) : couverture 2 pages en
  0,5 s, intérieur 44 pages en 41,6 s. Résultat sur l'export du 19/09 15:21 : couverture sans
  remarque ; intérieur 1 remarque (page 28, en bas, au milieu, débord de 0 à 1 mm sur 2,3 mm de
  bord : le coin d'une photo un peu inclinée). La page 36 est corrigée dans cet export ; le coffre
  ne l'a pas encore (dernier intérieur déposé : 19/09 14:05 UTC, export précédent).
- Deux fausses pistes du 19/09 documentées dans le code : une photo claire (ciel à 247-251) prise
  pour du papier avec un seul seuil à 245 (trois fausses alertes sur la couverture) ; l'onglet caché
  du navigateur de test qui n'hydrate jamais la fiche en flux (ce n'était pas l'import de pdf.js).
- La découpe qui échoue journalise désormais la cause en console (`[admin/impression] découpe
  impossible`) : le banc a mis deux jours à voir un « fichier introuvable ».
- Points 6 et 7 (résolution des photos) : toujours pas commencés.

**23/09/2026, dossier de Lara (« Lulu et Laraclette », 38 pages). Rien livré, mais les points 6, 7
et 8 sont désormais chiffrés sur un fichier réel, et la découpe est PROUVÉE en production.**
- Ce qui a déclenché la mesure : Mathias a cru voir « des photos un peu déformées sur les bords ».
  Vérifié sur les deux PDF tirés du coffre : **aucune photo n'est déformée**. Test direct, rapport
  largeur/hauteur en pixels contre rapport de la pose sur le papier, écart maximal **0,438 %** sur
  90 images de l'intérieur et 0,019 % sur la couverture, l'œil ne voit rien sous 1 %.
- Ce qu'il voyait est la réserve côté couture, conforme à la décision du 19/09 : 38 morceaux à
  l'échelle 1,000, 36 bandes étirées à 3,453× (1 mm tiré à 3,453 mm), échelle verticale 1,000
  partout. Trim à 3,3 pour 210 × 297, donc **3 mm partent à la coupe et 0,455 mm survivent** au
  ras du pli. Couverture : quatrième et première intactes, seul le dos étiré (1 mm → 2,98 mm).
- La découpe tient sur un second dossier réel : 38 pages de 216 × 303, couverture 428,98 × 303,
  page 2 vierge, dos 2,98 mm (38 p., finition nulle donc gloss par repli).
- **Le vrai défaut était invisible à la fiche** : une photo à 147 dpi, et onze placements sous
  200 dpi. Personne ne l'aurait vu, c'est exactement le point 6. Les originaux déposés portaient
  déjà ces tailles (768 × 1024, `appareil` NUL sur précisément les photos faibles : elles sont
  passées par une messagerie, qui retire l'EXIF et réduit).
- Après « améliorer l'image » de Canva, le minimum remonte à 161 dpi et la médiane à 362, mais
  voir le point 8 : le gain est partiel sur la photo faible et NÉGATIF sur les photos déjà bonnes.
- Méthode reproductible : `pdf-lib` lit les `Contents` (flux `FlateDecode` à décompresser), on suit
  `q`/`Q`/`cm`, on descend dans les Form XObject, on lit `Width`/`Height` des images ; `sharp`
  mesure la netteté. Aucun rasteriseur n'est installé sur le poste (ni `pdftoppm`, ni `mutool`,
  ni `gs`) : tout se fait par les boîtes et les matrices, ou par pdf.js dans le navigateur.

