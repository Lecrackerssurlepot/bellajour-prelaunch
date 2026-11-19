# Le tunnel : des photos déposées au magazine proposé

Dossier ouvert le 17/11/2026 (mission validée par Mathias, plan D32). Il porte TOUT ce qui sert à faire évoluer l'éditeur vers
« l'analyse se lance seule et rend un magazine déjà fait » : l'analyse, les règles, les retours de Mathias. Page visuelle du parcours
(privée) : https://claude.ai/artifact/BgVrPy7zs3ge8UviS2xC8t

**Règle de ce dossier : une règle est GÉNÉRALE.** Elle s'écrit pour un profil de projet ou une donnée mesurable (« un road trip », « une photo
avec des personnes », « une page couverte à moins de N % »), jamais pour un projet nommé. Un cas vu sur un projet de test devient une règle
générale, ou n'entre pas. Les essais chiffrés sur un projet précis restent sur le banc, hors du dépôt.

## Le registre des règles : LA source (18/11, T-216, M-11)
Depuis le 18/11, une règle du tunnel n'existe que si elle est au **registre** : `src/lib/mise-en-page/regles/`, une règle = une donnée
(identifiant, domaine, interdit ou préférence avec un poids, quand / alors sur des données mesurables, profils, réglages nommés de
`editeur/reglages.ts`, statut, source, date, contrôle). Le registre est versionné (`versionRegles()`), contrôlé au harnais
(`scripts/verif-mep-regles.ts`), montré dans l'atelier (`/admin/atelier/mise-en-page/regles`, avec le nombre de corrections de l'atelier
par règle) et écrit en clair dans [`REGISTRE.md`](REGISTRE.md), **généré, à ne pas éditer**.
- Les retours de Mathias (M-02 à M-10) y sont `confirmee_mathias` ; les interdits durs déjà contrôlés dans l'éditeur (I-01 à I-07) `codee` ;
  les règles nées du banc (N-…, DA-…) et toute la matière des équipes (S-…, C-…, F-…, R-T-…) `hypothese`.
- **Les fichiers de `regles/` deviennent la matière d'origine** : on les lit pour comprendre une règle, on ne les cite plus comme source
  de vérité. `scripts/regles-reprise.ts` les reprend (en généralisant, M-01) dans `regles/reprise.ts` ; le harnais refuse une reprise
  qui ne les suit pas. Une règle reprise se retouche dans `regles/surcharges.ts`.
- Statuts : `hypothese` → `en_ombre` (calculée et montrée, jamais appliquée) → `codee` (appliquée et contrôlée) ; `confirmee_mathias`
  pour un retour de Mathias ; `retiree` sans jamais réutiliser l'identifiant. Le compositeur citera une règle à chaque décision (`Decision`).
- Comment ajouter une règle : `src/lib/mise-en-page/CLAUDE.md`, section « Le registre des règles ».

## Le socle (19/11, T-219, D34) : le moteur en sept moteurs et huit priorités
Le plan du moteur écrit le 19/11 (hors git) et approuvé par Mathias est inscrit dans le dépôt, en DONNÉES. **Rien n'est câblé** :
le compositeur et l'éditeur n'en lisent rien ; c'est la carte de ce qu'on va construire, contrôlée au harnais.
- **Les sept moteurs**, dans l'ordre, chacun reçoit des données, en rend, et ne revient jamais sur le précédent : Lecture, Tri, Récit,
  Assortiment, Mise en page, Habillage (6a : il annonce les textes AVANT la mise en page ; 6b : il les écrit APRÈS), Revérification.
- **L'échelle P0 à P7** : interdit absolu, fabrication, vérité, récit, assortiment, mise en page, style, préférence. Une règle ne force
  jamais la violation d'un niveau au-dessus ; de P3 à P7 elle dit son repli.

| Quoi | Où vit la donnée | Lisible dans |
|---|---|---|
| 1 234 règles (état d'intégration, statut, liens vers le registre) | `src/lib/mise-en-page/regles/socle/genere/regles.ts` (généré) | `REGISTRE.md`, partie « Le socle » |
| 1 023 paramètres (doubles fusionnés, alias, valeur, plage, statut, réglage du code) | `…/socle/genere/parametres.ts` (généré) | `socle/PARAMETRES.md` |
| 151 informations et leur libellé d'atelier, les rôles d'une photo | `…/socle/genere/informations.ts`, `…/socle/libelles.ts` | `socle/INFORMATIONS-TABLE.md` |
| 27 questions et ce que chaque réponse règle | `…/socle/questions.ts` | `socle/QUESTIONS-TABLE.md` |
| profils, thèmes, modificateurs, curseurs, écoles | `…/socle/genere/profils.ts` (généré) | `socle/QUESTIONS-TABLE.md` |
| arbitrages, réponses de Mathias (M-35 à M-57), questions à trancher, conflits | `…/socle/decisions.ts` | `socle/A-TRANCHER.md` |
| ce que chaque moteur reçoit et rend | `src/lib/mise-en-page/moteurs/contrats.ts` (types) | `socle/PROCESSUS.md` §2 |
| le processus, les informations, les questions, l'entraînement, l'intégration, l'avis | copies NETTOYÉES (M-01) | `socle/*.md` |

**Comment ajouter**, toujours : la donnée, puis `npx tsx --tsconfig tsconfig.json scripts/socle-doc.ts` et `scripts/regles-doc.ts`,
puis le harnais (`scripts/verif-mep-socle.ts`).
- **Une règle** : le socle hors git reste la matière ; on écrit la règle dans le lot du socle (`20` à `23`, puis `outils/extraire.py`)
  et on rejoue `npx tsx --tsconfig tsconfig.json scripts/socle-import.ts`. Une retouche d'une règle importée (état, priorité, texte)
  s'écrit dans `socle/decisions.ts` (`ARBITRAGES_INTEGRATION`, ou la réponse de Mathias qui la tranche), jamais dans `genere/`.
  Identifiant du lot (`LEC-`, `TRI-`, `REC-`, `ASS-`, `MEP-`, `TXT-`, `COU-`, `POL-`, `FIL-`, `STY-`, `CV-`, `VER-` et trois chiffres),
  un repli de P3 à P7, chaque chiffre en paramètre nommé, GÉNÉRALE (M-01).
- **Un paramètre** : il naît avec la règle qui le cite ; un nom en double se fusionne (le nom gardé, l'ancien en alias) ; une valeur
  tranchée par Mathias s'écrit dans sa réponse (`REPONSES_19_11`), une valeur d'arbitrage dans `PARAMETRES_ARBITRES`.
- **Une information** : dans `11-INFORMATIONS` du socle (puis `outils/informations.py`), ou dans `INFOS_19_11` de `scripts/socle-import.ts` ;
  son libellé d'atelier dans `socle/libelles.ts` quand la traduction mot à mot ne suffit pas (M-57). Une information lue n'est jamais
  retirée faute d'usage : elle est « gardée pour l'atelier » (M-56).
- **Une question** : dans `socle/questions.ts`, chaque réponse avec les paramètres qu'elle règle ; si le dossier porte déjà la réponse,
  `depuisLeDossier` cite le champ réel (`fichier#mot`, relu par le harnais) et rien n'est demandé (M-54).
- **Une réponse de Mathias** : ses mots dans `RETOURS-MATHIAS.md` (un M-…) ET dans `REPONSES_19_11` (à la lettre, le harnais compare),
  avec les règles qu'elle confirme et les paramètres qu'elle pose ; ce qui reste ambigu va dans `aPreciser`.

## Le parcours
1. **Analyse** (`TUNNEL.md`, `INVENTAIRE-PHOTO.md`) : sept couches. 1 fichier, 2 pixels, 3 ensembles, 4 lieux : sans IA, gratuites. 5 planches de
   16 vignettes, 6 regard fin photo par photo, 7 le voyage en un appel texte : IA, payantes. Seules les photos utiles arrivent à l'IA, jamais deux fois.
2. **Règles** (`regles/`) : profils de projets, sélection et structure, questions de métier, couleur, filtres, polices et combos.
3. **Composition** : trier → construire la trame → poser (gabarits de l'éditeur) → habiller → rendre (premier jet, PDF, couvertures).
4. **Contrôle et boucle** : contrôle automatique des fautes, jugement d'un directeur artistique, corrections en règles, passe suivante.
5. **Retours de Mathias** (`RETOURS-MATHIAS.md`) : ses mots, datés, et la règle générale que chacun devient. Ils priment sur tout le reste.

## Les fichiers
| Fichier | Contenu |
|---|---|
| `TUNNEL.md` | le tunnel mesuré couche par couche, la fiche de chaque tag, le budget et la règle de dégradation pour tenir 1 € |
| `INVENTAIRE-PHOTO.md` | tout ce qu'une photo peut donner, comment, à quel coût, avec quelle fiabilité, pour quel usage |
| `regles/PROFILS.md` | les profils de projets et ce que chacun change |
| `regles/REGLES-STRUCTURE-SELECTION.md` | S-001 à S-158 : intérêt, rafales, chapitres, rythme, densité, couverture |
| `regles/QUESTIONS.md` | le registre des questions de métier, tranchées ou ouvertes |
| `regles/REGLES-COULEUR.md` | C-001 à C-063 : harmonie depuis les couleurs des photos, fonds, noir, impression |
| `regles/FILTRES.md` | 30 filtres réglables, trois portées (photo, double, magazine), règles de proposition F-001 à F-018 |
| `regles/BANQUE-POLICES.md`, `COMBOS-TYPO.md`, `CHOIX-AUTO.md` | la banque de polices par thème, 40 combos, le choix automatique de trois propositions |
| `regles/REGLES-CODEES-AU-BANC.md` | les règles réellement codées dans le compositeur du banc, celles qui n'ont pas pu l'être, les règles nées des critiques |
| `RETOURS-MATHIAS.md` | les retours de Mathias et leurs règles générales |
| `DEFINITION.md` | la définition v2 (18/11) : la table du nombre de photos par double, les cinq notes, écarter et réserver, structure, textes, questions, tags, corrections, paramètres par profil |
| `REGISTRE.md` | **généré** par `scripts/regles-doc.ts` : le registre des règles, par domaine, avec sa version ; puis le socle, par moteur et par priorité |
| `socle/` | le socle du 19/11 : copies nettoyées (PROCESSUS, INFORMATIONS, QUESTIONS-PARAMETRES, ENTRAINEMENT, INTEGRATION, AVIS) et tables générées (PARAMETRES, INFORMATIONS-TABLE, QUESTIONS-TABLE, A-TRANCHER) |

## État (18/11/2026)
- Dans l'éditeur, sur branche (`feat/editeur-qui-compose`, T-217, couche C20) : « Composer le magazine » : les questions (fiche, qui prime),
  l'analyse (planches avec quatre tags de plus, regard fin, le voyage, les lieux par chapitre), la composition par le compositeur porté du
  banc (`src/lib/mise-en-page/compositeur/`), chargée comme un premier jet, « Posées et laissées » (M-02), M-10. Rejoué sur le projet de
  test : les mêmes magazines que le Python de la passe 10, dans les deux tailles. Fiche : `docs/moteur/couches/C20-compositeur.md`.

## État (17/11/2026)
- Dans l'éditeur : couches 1 à 3, et « Lire les photos » (couches 5 et 6) sur les créations libres (T-215, D31).
- Sur le banc seulement (`design-explorations/tunnel-2026-11-17/`, hors git, photos de clients) : couche 7, compositeur, contrôle, sept passes sur un
  projet de test (long voyage en famille, 164 photos, 48 pages). Coût mesuré de l'analyse : 0,38 $ pour 164 photos.
- Rien de ces règles n'est validé par Mathias tant qu'il ne l'a pas dit : ce sont des hypothèses rejouées. Les licences des polices sont notées
  de mémoire, à relire au téléchargement. Le profil d'impression réel de Cloudprinter n'est pas connu.
- Manquent dans l'éditeur : gabarits pour photos très larges (21:9), ouverture de chapitre à plusieurs photos, couverture panoramique, filtres,
  polices de la banque, lancement automatique, écrans de choix.

## À savoir en lisant ces fichiers
Les équipes ont écrit leurs règles en s'appuyant sur le projet de test, nommé par le prénom de la cliente : ces passages sont des EXEMPLES
chiffrés, pas des règles. Quand une règle ne vaut que pour cet exemple, elle est à généraliser ou à retirer (M-01).
