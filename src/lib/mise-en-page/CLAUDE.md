# Mise en page interne : les modules purs

Chargé dès qu'on touche `src/lib/mise-en-page/**`. Le moteur de l'outil interne qui compose un
magazine à partir de photos et l'exporte vers Affinity (IDML). Référence : `brief-outil-mise-en-page-interne.md`.

- `geometrie.ts` : LA source des mesures (A4, planche 420, fond perdu 3, marges, grille 6 × 6).
- `types.ts` : templates = données (cadres en mm), `orientationDe`, `pourCote`.
- `templates.ts` : les 4 doubles de l'annexe, recopiées à l'identique. `grilles.ts` : les grilles de secours.
- `recadrage.ts` : LE calcul photo dans cadre. `magazine.ts` : l'état et ses transitions.
- `idml.ts` : l'export IDML, portage fidèle de `idml-test-generator.py` (validé dans Affinity) : ne changer
  un élément ou un attribut qu'après un nouvel essai Affinity (`scripts/idml-essai.ts`). `paquet.ts` : les zips
  (fflate) ; `mimetype` PREMIER et stocké.
- `sauvegarde.ts` : la sauvegarde partagée (table `mises_en_page`, migration 20261027, ÉCRITE non appliquée) : `contenuValide`
  relit la forme EXACTE de `Magazine` (clé en trop = refus) ; un champ ajouté à `Magazine` s'ajoute là, sinon 400.
  `TAILLE_MAX_CONTENU` (2 Mo, borne technique) ; `issueSauvegarde` = le verrou optimiste. Routes : `/api/admin/atelier/mise-en-page/magazines`.

## Le contrat
- **Un seul recadrage** : `cadrer` sert l'écran ET l'export. Ce qu'on voit est ce qu'Affinity reçoit.
- Tout en **mm**, origine au coin haut gauche (bord de coupe). Points seulement à l'export (`PT_PAR_MM`).
- Un template `page` est défini pour la **page droite** ; la gauche est son miroir (`pourCote`).
  Un template `double` est en repère planche 420 × 297. `cadresDe` rend tout en repère planche.
- La planche 0 est une page droite seule : elle ne bascule pas, ne se supprime pas.
- Les ids de template sont stables (un magazine sauvegardé les référence) : ne jamais renuméroter.

## Les interdits
- Aucun import de `src/lib/atelier` ni d'un ancien moteur de mise en page (le brief repart de zéro).
- Aucune IA, aucun tri « intelligent » : des règles simples et déterministes.
- Modules purs : ni React, ni réseau, ni horloge dans les transitions.

## Les tests
Bloc « Mise en page » de `scripts/verif-atelier.ts`. Toute règle ajoutée ici s'y ajoute aussi.
