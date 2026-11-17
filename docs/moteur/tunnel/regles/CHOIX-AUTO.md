# Comment la machine choisit le combo de polices

Cahier du typographe, tunnel du 17/11/2026. Se branche sur R-T-01 à R-T-09 (une paire par magazine, choisie avant la première page ; on change de paire, jamais de police), R-T-02, R-T-03, R-T-05, R-T-06
(`typographie.md` §4) et sur R-T-40 à R-T-60 (`COMBOS-TYPO.md`). Banque : `BANQUE-POLICES.md` (B-xx) ; combos : `COMBOS-TYPO.md` (C-xx, et T-xx du catalogue). Tout seuil et tout poids est un **réglage de départ**,
à nommer dans `editeur/reglages.ts` et à rejouer sur les projets du banc (Joëlle, puis les autres profils). **Aucun appel de plus à OpenAI** : le choix se fait avec des tables, sur des tags que le tunnel pose déjà.

## 1. Ce que la machine lit (entrées)

Par ordre de confiance : **la fiche saisie par Mathias** (type, qui, ambiance, mots à faire apparaître) > **la couche 7** (voyage, une ligne) > **les tags des couches 1 à 6** > **une valeur par défaut**.

| Entrée | D'où elle vient | Forme | Sert à |
|---|---|---|---|
| `pays[]` et part de photos par pays | GPS EXIF + Geoapify (couche 4) | liste de codes + part | thème de pays |
| `region` | table pays → région (Japon, Asie du Sud-Est…) | clé | thème de pays |
| `lieux_caracteres` | noms de lieux + texte du client | ensemble de caractères | couverture des accents (R-T-49) |
| `typeVoyage` | fiche, sinon couche 7 | road trip · city trip · séjour plage · randonnée · fête · événement · année · autre | choix de l'ambiance |
| `profil` | fiche, sinon couche 7 (qui, par comptage de visages, D29) | voyage-famille · jeunes-festif · couple · événement · année | table de décision |
| `ambiance` | couche 5 (ambiance par photo), agrégée | parts : chaleureux, lumineux, urbain, brut, tendre, festif, calme, nature, nuit | ton |
| `partNuit` | heure EXIF + luminance + moment de la journée (couche 5) | 0 à 1 | R-T-51, veto |
| `saison`, `hemisphere` | date EXIF + latitude | printemps · été · automne · hiver, N ou S | chaleur, rétro |
| `palette` | couche 2 (5 couleurs par photo) → nuancier | température b*, saturation C*, parts de bleu, vert, ocre | départage (R-T-53) |
| `partNB` | couche 2 | 0 à 1 | didone ou grotesque |
| `titre`, `histoire` | fiche, texte du client | texte | longueur, caractères, ton (R-T-02, R-T-05) |
| `densite` | photos par double (structure) | nombre | R-T-04 |
| `format` | taille choisie : serré, normal, généreux | clé | rapport de l'échelle |

## 2. La table de décision

Étape 1, **filtres durs** (un combo qui échoue est écarté, avec la raison dite) : (a) licence relue et fiche de la police complète (R-T-40) ; (b) tous les `lieux_caracteres` et les caractères du texte présents dans les polices du combo (R-T-49) ;
(c) familles ≤ 2 (≤ 3 si la dérogation de Mathias existe) ; (d) police de caractère du combo ∉ liste de caricatures (R-T-48) ; (e) fichiers de police ≤ 4 (R-T-56) ; (f) titre de plus de 14 signes → combo en capitales écarté (R-T-52).

Étape 2, **score** (réglage de départ, 0 à 100 après normalisation) :

`score = 3 × pays + 3 × profil + 2 × ambiance + 1 × nuit + 1 × saison + 1 × palette + 1 × densité`   (tous les termes de 0 à 1, poids de départ : 12 au total)

| Terme | 1 | 0,5 | 0 |
|---|---|---|---|
| pays | le thème du combo est celui de la région dominante (≥ 50 % des photos géolocalisées) | région voisine (Méditerranée ↔ Maghreb, Asie du Sud-Est ↔ Japon) | autre, ou projet multi-pays sans dominante (alors poids = 0 pour tous : le thème n'est pas évoqué) |
| profil | le profil est dans les profils du combo (V F C E A) | profil voisin (V ↔ A, F ↔ C) | non |
| ambiance | l'ambiance dominante de `ambiance` est dans les humeurs du combo | la deuxième | non |
| nuit | `partNuit` ≥ 0,25 et combo « nuit » (ou < 0,25 et combo jour) | indifférent | **veto** : `partNuit` ≥ 0,4 et combo à titre fin (Poiret, Bodoni fine, Italiana, Great Vibes, Spectral 300) |
| saison | combo chaud pour photos chaudes (R-T-53), combo froid pour froides | indifférent | contraire |
| palette | b* et C* cohérents (R-T-53), N&B ≥ 0,33 → didone ou grotesque | indifférent | contraire |
| densité | > 4 photos par double → combo à texte discret, titre court ; ≤ 2 → titres présents | — | contraire |

Étape 3, **règles de composition des trois propositions** (voir §3). Rien n'est appliqué sans le clic de Mathias.

**Correspondance ambiance → ton du combo** (réglage de départ) : chaleureux → slab, serif douce (Zilla Slab, Vollkorn, Young Serif, Fraunces) ; lumineux → lapidaire, humaniste (Marcellus, Cinzel, Ysabeau) ; urbain → grotesque contemporaine
(Inter Tight, Bricolage, Syne) ; brut → condensée (Oswald, Bebas, Big Shoulders) ; tendre → serif de plume, rond (Lora, Quicksand, Instrument Serif) ; festif → fat, script rond (Shrikhand, Pacifico, Rubik) ; calme → serif fine, mincho
(Shippori, Spectral, EB Garamond) ; nature → humaniste (Alegreya, Literata, Karla) ; nuit → grotesque et mono (Space Grotesk, Zen Kaku, Plex).

**Correspondance profil → densité et rapport** (R-T-54) : voyage-famille : 1,618, légendes complètes ; jeunes-festif : 2, texte très court ; couple : 1,333 ou 1,618 ; événement : 1,333, un titre ; année : 1,333, repères partout.

## 3. Les trois propositions (jamais une seule)

La machine garde les **3 meilleurs scores** selon ces règles, et les **montre avec les doubles de Mathias** (couverture + une double d'intérieur + une page de texte, une ligne de justification chacune) :

1. **Le plus fidèle au thème** : meilleur score global.
2. **Un second angle** : meilleur score dont la **police de titre est différente** et dont le **ton diffère** (par exemple chaleureux au lieu de brut). Jamais deux combos avec le même titre.
3. **Le plus sûr** : meilleur combo **sans téléchargement** (catalogue, T-xx) et sans police de caractère : le repli qui marche à coup sûr, y compris si une police de la banque n'est pas encore entrée au catalogue.

Garde-fous : au plus **un** combo à police de caractère forte (display, script, japonaise, deco) parmi les trois ; les trois respectent les filtres de l'étape 1 ; aucun ⚑ si la dérogation n'existe pas (la version à deux familles est montrée, notée « sans l'accent »).
Chaque proposition dit : le nom (« Piste »), le thème évoqué, ce qu'elle **ne va pas** faire (une phrase), ce qu'il faudra télécharger (liste vide si rien), et les points à mesurer (contraste du titre posé, accents).

Si **aucun combo ne passe** les filtres (un nom de lieu avec une lettre que nulle police n'a), la machine garde les trois du catalogue, le dit, et nomme le caractère. Si **le pays est inconnu** (pas de GPS, pas de fiche) : le terme « pays » vaut 0 pour tous,
et la proposition 1 vient du profil et de l'ambiance. Si **le projet est multi-pays** sans dominante : le thème n'est jamais évoqué par une police de caractère ; on prend un combo de profil neutre (C-28, C-39…).

## 4. Joëlle : Australie, novembre 2025, trois semaines, famille

**Ce que j'ai regardé** : 12 photos prises tous les quatorze rangs parmi les 165 de `photos/joelle/` (pas les 165 : c'est un échantillon, dit comme tel). On y voit : un 4×4 aménagé avec tente de toit sur un parking ensoleillé (le road trip),
trois personnes assises sur un banc de bois devant la brousse, la famille minuscule entre des blocs de granit sous un ciel couvert, une tour de verre derrière des palmiers au crépuscule (une ville, et la seule « nuit » de l'échantillon).
Palette : bleu de ciel, vert olive de la brousse, ocre et sable, gris de granit. Photos de téléphone (cadrages variables, portrait et paysage). Les personnes sont petites dans le cadre, le ciel est grand : de la place pour des titres courts, mais **le bleu est clair** :
un titre blanc devra être contrôlé au pire endroit (R-T-31 ; le cas de Lara, blanc sur bleu ciel à 1,6:1, est à ne pas refaire).

**Entrées (déduites, la fiche n'a pas été saisie)** : `pays` = Australie (région AU, hémisphère sud) ; `saison` = printemps austral (novembre), lumière claire, peu chaude de ton, bleue ; `typeVoyage` = road trip ; `profil` = voyage-famille
(trois personnes sur la photo du banc : à confirmer par le comptage de visages, D29, et la fiche) ; `partNuit` faible (une photo sur douze) ; `partNB` ≈ 0 ; `ambiance` dominante = nature et brut, deuxième = chaleureux ; `lieux_caracteres` = lettres latines sans accent (Perth, Sydney, Uluru, noms de parcs) :
couverture des accents à tester seulement pour le texte français du client (é è ê ç œ) ; `densite` = à calculer par la structure (voyage long : plutôt aéré pour les grandes photos mises en valeur, plus dense sur quelques doubles).

**Résultat de la table** (tous combos ayant passé l'étape 1 sous réserve du test des accents au téléchargement) :

| Rang | Combo | pays | profil | ambiance | nuit | saison | palette | densité | Note /12 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | C-01 « Piste » (Oswald + Source Serif 4) | 1 | 1 | 1 (brut) | 1 | 0,5 | 0,5 | 1 | ≈ 11 |
| 2 | C-03 « Camp du soir » ⚑ (Zilla Slab + Karla + Caveat) | 1 | 1 | 1 (chaleureux) | 1 | 0,5 | 0,5 | 0,5 | ≈ 10,5 |
| 3 | C-02 « Côte sauvage » (Fjalla One + Lora) | 1 | 0,5 | 0,5 | 1 | 0,5 | 0,5 | 1 | ≈ 9,5 |
| 4 | T-13 (Alegreya + Alegreya Sans) | 0,5 | 1 | 1 (nature) | 1 | 0,5 | 0,5 | 1 | ≈ 9 |

Notes calculées à la main avec les poids du §2 ; à rejouer par le code (rien n'est « mesuré » : ce sont des cotes de typographe).

**Les trois propositions montrées à Mathias** (règles du §3 : le plus fidèle, un second angle de titre et de ton différents, le plus sûr du catalogue) :

**Proposition 1, « Piste » (C-01) : Oswald 600 en capitales + Source Serif 4.**
Titre 25 pt (rapport 1,618), texte 9,5, légende 7,5 en capitales espacées, accent en Source Serif italique. Pourquoi : le road trip se dit en capitales hautes, étroites, de signalétique routière (Oswald), qui tiennent même sur le grand ciel ; Source Serif 4 est la
police de lecture neutre et déjà au catalogue (aucun téléchargement pour le texte). Une seule police de caractère. **Ce qu'elle ne fera pas** : un titre de plus de 14 signes (il est étroit mais haut), un titre
blanc sur le bleu clair sans contrôle de contraste. **À télécharger** : Oswald (OFL). **À mesurer** : contraste du titre sur ciel, accents des capitales (É È Ç Œ).

**Proposition 2, « Camp du soir » (C-03) ⚑ : Zilla Slab 600 + Karla + Caveat 700 en accent.**
Titre 25 pt, texte 9,5, légende 7,5 caps espacées, accent Caveat ≤ 8 mots. Pourquoi : c'est le carnet de bivouac de la famille, la slab chaleureuse du panneau de parc ; Caveat est déjà au catalogue (T-11) et sert de voix de carnet pour un mot ou une blague.
**Si Mathias ne lève pas la contrainte des deux familles, la proposition est montrée sans Caveat** (l'accent devient Karla italique). **Ce qu'elle ne fera pas** : le chic, la nuit, les titres empilés de capitales à 120 %. **À télécharger** : Zilla Slab, Karla (OFL).
**À mesurer** : hauteur d'x de Zilla et de Karla (écart sous 10 %, R-T-42), accents.

**Proposition 3, la sûre : T-13, Alegreya 700 + Alegreya Sans, du catalogue.**
Titre en bas de casse, texte 10,5 (petite x), légendes en repères. Pourquoi : la paire est déjà là (nature, famille, île), elle ne dépend d'aucun téléchargement, et ses lettres claires vont avec le vert et le granit ; la plume des Alegreya donne la douceur d'un voyage de famille.
**Ce qu'elle ne fera pas** : l'affiche, la fête, la nuit. **À télécharger** : rien.

**Pourquoi pas les autres** : T-05 (Archivo, pop, aplats) dirait la plage et le surf plus que la brousse ; C-04 (Pacifico) évoque le surf, pas une famille qui roule ; **aucune police « aborigène » ni western** (BANQUE §8) ; Playfair ou Bodoni (chic, ville) ne disent pas le 4×4.
Le thème « Australie » n'a pas de police « australienne » : il se dit par **la route, le ciel et le bush**, c'est-à-dire par la signalétique (condensée, slab) et par la nature (humaniste).

## 5. Ce que la machine apprend

Chaque choix de Mathias contre la proposition devient une leçon (`lecons.ts`) : « proposition n° k choisie », « combo refusé », « police remplacée ». Ces leçons règlent les poids du §2 (jamais seules : un accord de Mathias avant de les changer). Un combo refusé trois fois sur
le même thème sort de la proposition 1 pour ce thème, pas de la banque.

## 6. Ce que le tunnel d'analyse doit fournir

**Indispensable** (sans eux, le choix est aveugle) :
1. `pays[]` avec la **part de photos** par pays, et la région (Geoapify + EXIF GPS). Une valeur « inconnue » explicite.
2. `profil` du projet (fiche d'abord, comptage de visages ensuite), **avec son degré de certitude**.
3. `typeVoyage` (road trip, city trip, séjour plage, randonnée, fête, événement, année), **fiche ou couche 7**.
4. `ambiance` : parts par photo (chaleureux, lumineux, urbain, brut, tendre, festif, calme, nature, nuit) ; la couche 5 pose déjà « ambiance » en une étiquette, il faut la **liste fermée** ci-dessus pour que la table la lise.
5. `partNuit` (0 à 1) : heure EXIF, luminance, et le tag « moment de la journée » de la couche 5.
6. `date`, `saison`, `hemisphere` : la saison dépend de la latitude (novembre = printemps en Australie).
7. `palette` du magazine : température (b*), saturation (C*), part de N&B (déjà couche 2, nuancier).
8. Les **caractères du texte réel** : titre, histoire, légendes, noms de lieux (accents, ã, ø, ñ) : le tunnel envoie la chaîne, c'est la machine qui compte.
9. `densite` (photos par double) : fournie par la structure.

**Utile** : la **langue** du texte (français : typographie française ; autre : aucune correction) ; la **longueur du titre** ; un indicateur « fond noir demandé » (profil festif) ; la **hauteur d'x et la cmap** de chaque police, relevées une fois
au téléchargement et gardées dans la fiche de la police (pas à chaque projet).

**À ajouter au code de l'éditeur** (hors tunnel, pour l'intégration, à écrire en lot 1 ou 3 du plan) :
- Un **module pur `src/lib/mise-en-page/combos.ts`** (ou `polices-banque.ts`) : la table des combos en DONNÉES (id C-xx, rôles, classes, humeurs, profils, thèmes, cotes), le score du §2, les trois propositions.
- Un **niveau « accent »** dans `Paire` / `NIVEAUX` si la dérogation à trois familles est accordée ; sinon l'accent est un *style* de famille (graisse, italique, capitales) et le type n'a pas à bouger.
- La **génération de la ligne `police(...)`, de `polices.ts` et des chasses** depuis une fiche de police (au moment de l'entrée au catalogue, pas au choix).
- La **fiche de chaque police** (`docs/moteur/polices/<id>.md`) : licence relue, cmap testée, hauteur d'x, graisses, aperçu.

**Ce que l'interlignage figé à 120 % empêche dans ce choix** (R-T-50) : les titres serrés (80 à 100 %), donc les capitales empilées ; les polices à grande x en texte long (Poppins, Rubik, Prompt, Kanit) ; les textes denses sur colonne large.
Le choix automatique les écarte ou les confine (titre en une ligne, texte à 9,5 pt, colonne de 3 modules).
