# La banque de polices : 89 familles étiquetées

Cahier du typographe, tunnel du 17/11/2026. Rien n'est téléchargé : ceci est la LISTE, avec la licence, à valider avant tout téléchargement.
Part de `cycle-0-2026-11-10/regles/typographie.md` (R-T-01 à R-T-35, paires T-01 à T-17) et du catalogue d'`src/lib/mise-en-page/style.ts`
(30 familles, 18 paires). Ne réécrit rien : complète.

## 0. Ce qu'il faut savoir avant de lire la liste

**Source et licence.** Toutes les familles sont sur **Google Fonts**, donc sous **SIL Open Font License 1.1** (OFL), sauf **Special Elite**
(Apache 2.0). Les deux licences permettent d'embarquer la police dans un PDF vendu, de la servir sur le web et de l'utiliser dans un
produit commercial ; elles interdisent de vendre la police seule et (OFL) de republier une version modifiée sous le même nom.
Le pipeline existant (`@fontsource/<id>` → TrueType dans `public/polices/`, `next/font/google` à l'écran) reste le seul chemin : il garde
la police sous son nom d'origine, rien n'est modifié.
**Limite honnête de ce document : aucune page de licence n'a été relue en ligne dans cette séance.** Les licences ci-dessous sont celles que
je connais de ces familles ; à chaque téléchargement, on relit le champ « License » de la fiche Google Fonts (ou `METADATA.pb` du dépôt
`google/fonts`) et on le copie dans la fiche de la police. Une famille dont la licence diffère sort de la banque.
**Rien de `assets/typo/`** : 76 fichiers sur 136 interdisent la redistribution (décision du 14/09). Les polices que Mathias y possède et qui sont
aussi sur Google Fonts (Aboreto, Italiana, Tenor Sans, Ysabeau, Permanent Marker, Indie Flower, Mansalva…) passent par la version Google, pas par son fichier.

**Les trois états d'une police.**
- **Catalogue** : déjà dans `style.ts` et `polices.ts` (marquée ■). Zéro téléchargement.
- **Banque** : proposée ici (□). Entre au catalogue après validation, par une PR qui ajoute : la ligne `police(...)` de `style.ts`, la ligne littérale de
  `polices.ts`, les chasses (`chassesPolices.ts` regénéré), le TrueType de `public/polices/`. Le catalogue reste FERMÉ (R-T-09) : « téléchargées au fur et à mesure »
  veut dire « entrées au catalogue quand un projet en a besoin et que Mathias a validé le combo », jamais chargées à la volée au moment du choix (next/font est
  littéral et résolu au build).
- **Refusée** : voir §6.

**Les accents français : comment on le vérifie** (R-T-06, jamais « à l'œil »). Le sous-ensemble `latin` de Google contient la plage Latin-1 et Œ œ, mais
**la plage n'est pas le glyphe** : une police peut déclarer la plage et ne pas dessiner Œ. Test, à lancer sur le TrueType téléchargé, avant l'entrée en banque :

```
python3 -I -c "import sys; from fontTools.ttLib import TTFont; c=TTFont(sys.argv[1]).getBestCmap(); \
t='éèêëàâùûôîïçÉÈÊËÀÂÙÛÔÎÏÇŒœ«»’‘“”…–—♥ãñíóúőøåłčšž'; print([ch for ch in t if ord(ch) not in c])" fichier.ttf
```
La liste rendue doit être vide pour `éèêàçÉÈÀÇŒœ«»’…–` (indispensables) ; ã ñ í ő ø å ł č š ž ne comptent que si le projet nomme un lieu qui s'en sert
(São Paulo, Gran Vía, Budapest, Tromsø, Łódź). Particularités à connaître : **U+202F (espace fine insécable) est absente de toutes les polices du
catalogue** (l'espace fine est dessinée par `AVANCE_FINE_EM`, style.ts) ; **ᵉ ʳ** (ordinaux en exposant, « 1ᵉʳ ») manquent dans la plupart des polices : prévoir la
même parade ; **♥** manque souvent. Colonne « Accents » : **OK** = famille à grand Latin, test passé attendu mais à faire ; **tester** = famille de caractère
(display, script, japonaise, arabe, thaïe) où Œ, « », ’ ou les capitales accentuées sont le point faible ; **MAJ** = capitales seules (les minuscules sont des petites capitales ou
des capitales) : les accents des capitales sont donc le test ; ■ = déjà passé au harnais `verif-mep-style.ts`.

**Étiquettes de thème.** Région : JP Japon · SE Asie du Sud-Est · IN Inde · AU Australie et grands espaces · MED Méditerranée · NORD pays nordiques ·
LATAM Amérique latine · US États-Unis · MAG Maghreb · VILLE. Ton : famille · fête · nuit · chic · brut · rétro · enfance · mariage · tendre · sport · nature · carnet.
Époque : 16e (humaniste) · 18e (didone) · 1920 (déco) · 1930 (géométrique) · 1950 · 1970 · 80s · contemporain.
**Rôle** : T titre (grand corps, ≤ 4 mots) · X texte (lecture à 9,5 à 10 pt) · A accent (une voix de plus, ≤ 8 mots, jamais le texte courant : R-T-08).
**Hauteur d'x** (colonne x, pour les polices de texte) : p petite · m moyenne · g grande. Estimation de typographe, **à mesurer** dans le fichier (`OS/2.sxHeight ÷ unitsPerEm`)
au téléchargement : je n'invente pas de chiffre (R-T-24).

---

## 1. Polices de titre, classiques et éditoriales (serif, didone, lapidaire)

| # | Famille | Rôle | Graisses utiles | Thèmes | Accents | Ce qu'elle interdit | Déjà |
|---|---|---|---|---|---|---|---|
| B-01 | Bodoni Moda | T | 400, 600 + italique | chic · ville · 18e · mode · MED | ■ | titre fin sur photo agitée (déliés), enfance, sport, soirée au flash | ■ T-01 |
| B-02 | Instrument Serif | T | 400, italique | tendre · chic · couple · contemporain | ■ | tout titre qui veut du gras (elle n'en a pas) | ■ T-02 |
| B-03 | Marcellus | T | 400 | MED · mer · lieux · mariage · lapidaire | ■ (MAJ à l'usage) | titre long (lettres larges), sport, soirée | ■ T-03 |
| B-04 | Libre Caslon Display | T | 400 | famille · classique · 18e | ■ | texte courant (Display ne vit qu'en grand) | ■ T-15 |
| B-05 | Italiana | T | 400 | mariage · chic léger · ville · 1930 | ■ | titre sur photo chargée, petit corps | ■ T-16 |
| B-06 | EB Garamond | T, X | 400, 500 + italique | calme · intime · carnet · 16e · famille | ■ | grand titre gras (le gras est plus faible que le romain) | ■ TW-1 |
| B-07 | Fraunces | T | 900 (+ axes) | rétro · 1970 · gourmand · été · MED | ■ | N&B austère, deuil, sport ; les axes variables ne passent pas l'export (R-T-07) | ■ T-08 |
| B-08 | Playfair Display | T | 400, 700, 900 + italique | chic · éditorial · ville · 18e · mariage · mode | OK | texte courant (contraste trop fort à 9,5 pt), enfance | □ |
| B-09 | DM Serif Display | T | 400 + italique | éditorial · ville · contemporain · chic | OK | texte courant ; titres de plus de 14 signes (chasse large) | □ |
| B-10 | Gloock | T | 400 | chic · MED · Riviera · rétro 1970 | tester | texte, petit corps, légendes | □ |
| B-11 | Young Serif | T | 400 | famille · NORD · tendre · rétro doux · maison | tester | grand titre en capitales (dessin fait pour le bas de casse) | □ |
| B-12 | Cinzel | T | 400, 600, 700 | MED · Rome · Grèce · lapidaire · mariage · chic | MAJ : tester É È À Ç Œ | bas de casse (ce sont des petites capitales), tout ce qui est long | □ |
| B-13 | Forum | T | 400 | MED · Grèce · lapidaire · mariage · chic léger | MAJ : tester | tout texte long, sport, pop | □ |
| B-14 | Abril Fatface | T | 400 | rétro · pop · 18e fat face · LATAM · affiche | tester | texte courant, légende, N&B fin | □ |
| B-15 | Rozha One | T | 400 | IN · fête · pop · didone grasse | tester (Latin de la famille indienne) | texte, légende, capitales longues | □ |
| B-16 | Shrikhand | T | 400 | fête · rétro 1970 · LATAM · IN · vacances · soleil | tester | texte, légende, titre de plus de 3 mots, N&B | □ |
| B-17 | Chonburi | T | 400 | SE · MED · Portugal · enseigne · rétro | tester | texte, légende, titre de plus de 3 mots | □ |

## 2. Affiche, déco, rétro et machine à écrire

| # | Famille | Rôle | Graisses utiles | Thèmes | Accents | Ce qu'elle interdit | Déjà |
|---|---|---|---|---|---|---|---|
| B-18 | Anton | T | 400 | fête · bande · affiche · sport · brut | ■ | titre en bas de casse, mariage | ■ T-07 |
| B-19 | Archivo | T, X | 400, 900 (style Black de la famille) | pop · été · mer · aplats | ■ | mariage, deuil, intime | ■ T-05 |
| B-20 | Limelight | T | 400 | nuit · fête · 1920 · déco · grand soir | tester | texte, légende, petit corps | □ |
| B-21 | Poiret One | T | 400 | 1920 · déco · chic · nuit | tester (trait très fin) | sur photo agitée, petit corps, N&B granuleux | □ |
| B-22 | Alfa Slab One | T | 400 | LATAM · US · enseigne · rétro · affiche | tester | texte, légende, mariage | □ |
| B-23 | Pacifico | T | 400 | AU · surf · mer · 1950 · vacances · fête | OK (grand Latin) | plus de 4 mots, texte, légende, capitales, N&B | □ |
| B-24 | Special Elite | T, A | 400 (**Apache 2.0**) | carnet · rétro · journal de bord · tampon | tester | texte courant, titre sur photo, enfance | □ |
| B-25 | Yellowtail | T | 400 | carte postale · vacances · ville au soleil | ■ | plus de 4 mots, légende, capitales | ■ T-09 |
| B-26 | Permanent Marker | T, A | 400 | bande · blague · une année · feutre | ■ | mariage, chic, bloc de plus de 8 mots | ■ T-10 |

## 3. Japon : polices japonaises à Latin soigné, et leurs voisines

**Principe (à lire).** Pour « un peu asiatique », on choisit des polices **conçues à Tokyo ou Kyoto, dont le jeu Latin est dessiné pour aller avec les kanji**
(Shippori Mincho, Zen, Kaisei, Klee One), et des polices **latines à dessin géométrique et net** (Jost, Tenor Sans, Marcellus). On évoque par la construction, la
sobriété et le vide, jamais par des lettres « en coups de pinceau » qui imitent des caractères. Ces familles contiennent aussi les kanji et kana :
si le client veut écrire « 日本 » ou « ありがとう », la même police le fait (**sous-ensemble `japanese` de fontsource, lourd : à n'ajouter que sur demande**).
Pour le Latin seul, ne servir que le sous-ensemble `latin`.

| # | Famille | Rôle | Graisses utiles | Thèmes | Accents | Ce qu'elle interdit | Déjà |
|---|---|---|---|---|---|---|---|
| B-27 | Shippori Mincho | T, X | 400, 600, 800 | JP · calme · élégant · temple · carnet · contemporain | tester (Latin-1 attendu, Œ incertain) | titre en capitales larges (le Latin est dessiné pour la ligne), grand corps gras | □ |
| B-28 | Zen Old Mincho | T | 400, 700, 900 | JP · éditorial · livre · 16e japonais | tester | texte long à petit corps (traits fins) | □ |
| B-29 | Kaisei Tokumin | T | 400, 700 | JP · affiche de librairie · chic · nuit | tester | texte long, petit corps | □ |
| B-30 | Zen Kaku Gothic New | T, X | 400, 500, 700, 900 | JP · ville · nuit · Tokyo · net · contemporain | tester | titre long en capitales grasses (chasse serrée à 120 %) | □ |
| B-31 | Zen Maru Gothic | T, X | 400, 500, 700 | JP · famille · enfance · tendre · doux | tester | chic, nuit froide | □ |
| B-32 | Klee One | A, T | 400, 600 | JP · carnet · manuscrit au crayon · tendre · école | tester | texte courant, légende, capitales (écriture de tableau noir) | □ |
| B-33 | Tenor Sans | T, X | 400 | JP · lapidaire géométrique · chic · mariage · Italie | OK (possédée aussi) | grand titre gras, nuit | □ |
| B-34 | Jost | T, X | 400, 500, 700 | 1930 · géométrique · NORD · mariage · ville | ■ | mot géant fin, sport | ■ T-16, TW-1 |

## 4. Maghreb, Inde et Asie du Sud-Est

**Même principe.** Pour le Maghreb : des polices **conçues par des dessinateurs arabes**, dont le Latin est accordé à la ligne arabe (Amiri, El Messiri, Cairo, Reem Kufi,
dessin géométrique d'esprit coufique). Jamais de « lettres de contes des mille et une nuits » (§6). Pour l'Inde et la Thaïlande : des familles dessinées localement
(Indian Type Foundry : Poppins, Rozha One, Shrikhand ; Cadson Demak : Kanit, Prompt, Pridi, Mali), dont le Latin est solide et sans folklore.

| # | Famille | Rôle | Graisses utiles | Thèmes | Accents | Ce qu'elle interdit | Déjà |
|---|---|---|---|---|---|---|---|
| B-35 | Amiri | T, X | 400, 700 + italique | MAG · médina · livre · calligraphique · élégant | tester | texte long à petit corps (le Latin est à fort contraste) | □ |
| B-36 | El Messiri | T | 500, 600, 700 | MAG · Orient · affiche chic · soir | tester | texte courant | □ |
| B-37 | Reem Kufi | T | 400, 600 | MAG · géométrique · zellige · ville · carrelage | tester (Latin sobre, Œ incertain) | texte, légende, plus de 3 mots | □ |
| B-38 | Cairo | T, X | 400, 600, 900 | MAG · ville · contemporain · désert · net | tester | enfance, chic classique | □ |
| B-39 | Prompt | T, X | 400, 600, 800 | SE · Thaïlande · ville · marché · pop net | OK | grande hauteur d'x : serré à 120 %, jamais en texte long | □ |
| B-40 | Kanit | T | 500, 700, 800 + italique | SE · Thaïlande · sport · nuit · pop · carré | OK | texte courant (grande hauteur d'x), mariage | □ |
| B-41 | Mali | T, A | 400, 600 + italique | SE · enfance · école · tendre · manuscrit rond | OK | chic, nuit, texte long | □ |
| B-42 | Pridi | T, X | 300, 400, 600 | SE · calme · maison · chaleureux (serif de Thaïlande) | OK | titre fin sur photo, sport | □ |
| B-43 | Be Vietnam Pro | X, T | 400, 600, 800 | SE · Vietnam · ville · net · contemporain | OK (couvre aussi les diacritiques vietnamiens) | chic éditorial | □ |
| B-44 | Poppins | X, T | 400, 500, 700 | IN · SE · fête · pop · géométrique rond · contemporain | OK | élégant, mariage, nuit froide ; **hauteur d'x grande : 9,5 pt** | □ |
| B-45 | Josefin Sans | T, X | 300, 400, 600 | 1920 · déco · vintage · NORD · mariage léger | OK | texte long (petite hauteur d'x, jambages longs) | □ |
| B-46 | Quicksand | T, X | 400, 600, 700 | SE · enfance · tendre · famille · doux | OK | chic, sport, N&B | □ |

## 5. Grands espaces, brut, ville, sport, nuit

| # | Famille | Rôle | Graisses utiles | Thèmes | Accents | Ce qu'elle interdit | Déjà |
|---|---|---|---|---|---|---|---|
| B-47 | Oswald | T | 500, 600, 700 | AU · US · grands espaces · brut · sport · affiche | OK | texte courant, mariage | □ |
| B-48 | Bebas Neue | T | 400 | AU · US · brut · affiche · sport · ciel | MAJ : tester É È Ç Œ | bas de casse, plus de 14 signes | □ |
| B-49 | Fjalla One | T | 400 | AU · NORD · montagne · brut · carte | OK | texte, mariage | □ |
| B-50 | Big Shoulders Display | T | 700, 800, 900 | US · Chicago · industriel · brut · sport · nuit | OK | texte, tendre, enfance | □ |
| B-51 | Staatliches | T | 400 | US · campus · équipe · fête · affiche | MAJ : tester | bas de casse, tendre | □ |
| B-52 | Barlow Condensed | T | 900 (+ 600) | sport · route · équipe · brut | ■ | tendre, mariage | ■ T-06 |
| B-53 | Rubik | T, X | 400, 700, 800 | LATAM · rue · pop · brut · rond léger | OK | chic, grande hauteur d'x : serré à 120 % | □ |
| B-54 | Zilla Slab | T | 500, 600, 700 | AU · road trip · carnet · nature · brut chaleureux | OK | mariage, nuit froide | □ |
| B-55 | Bitter | X, T | 400, 600, 700 | US · carnet · maison · lecture à l'écran | OK | enfance, chic | □ |
| B-56 | Syne | T | 600, 700, 800 | VILLE · nuit · galerie · contemporain · décalé | OK | famille classique, mariage, texte long | □ |
| B-57 | Bricolage Grotesque | T | 600, 700, 800 | VILLE · contemporain · pop doux · caractère | OK | chic classique, texte long | □ |
| B-58 | Space Grotesk | T, X | 400, 700 | VILLE · bande · repères · nuit | ■ | tendre, mariage | ■ T-10 |
| B-59 | Space Mono | A | 400, 700 | nuit · heures · journal · technique | OK | texte long, tendre | □ |
| B-60 | IBM Plex Sans Condensed | T | 400, 600 | archive · nuit · journal heure par heure | ■ | tendre, enfance, mariage | ■ T-14 |
| B-61 | IBM Plex Mono | A | 400 | archive · nuit · heures · relevé | ■ | texte long | ■ T-14 |
| B-62 | Inter Tight | T | 800 | VILLE · contemporain · éditorial moderne | ■ | mariage, enfance | ■ T-17 |

## 6. Scripts et écritures à la main (jamais un texte courant, jamais en capitales)

| # | Famille | Rôle | Graisses utiles | Thèmes | Accents | Ce qu'elle interdit | Déjà |
|---|---|---|---|---|---|---|---|
| B-63 | Caveat | T, A | 400, 700 | carnet · tendre · couple · lettre | ■ | capitales, noms de lieux en capitales | ■ T-11 |
| B-64 | Great Vibes | A, T | 400 | mariage · faire-part · chic · 18e calligraphie | tester | plus de 4 mots, légende, capitales, minuscules en petit corps (le délié disparaît) | □ |
| B-65 | Sacramento | A | 400 | carte postale · rétro · tendre · mariage léger | tester | plus de 4 mots, petit corps | □ |
| B-66 | Amatic SC | T, A | 400, 700 | MED · Grèce · taverne · enfance · carnet · tableau noir | MAJ : tester | texte, longues phrases | □ |
| B-67 | Fredoka | T | 400, 600, 700 | enfance · naissance · fête douce · rond | OK | chic, nuit, mariage | □ |
| B-68 | Nunito | T, X | 400, 900 | enfance · naissance · famille | ■ | couple, chic, mode | ■ T-12 |

## 7. Polices de texte (lecture à 9,5 – 10 pt, 120 % d'interlignage)

Seules ces polices portent le texte courant (R-T-45). Les polices des §1 à §6 ne le portent jamais, sauf celles marquées X.

| # | Famille | Classe | x | Graisses utiles | Thèmes | Accents | Ce qu'elle interdit | Déjà |
|---|---|---|---|---|---|---|---|---|
| B-69 | Source Serif 4 | serif de lecture | m | 400, 600 + italique | neutre · éditorial · fête (avec Anton) | ■ | — | ■ T-07 |
| B-70 | Lora | serif calligraphique | m | 400, 500 + italique | tendre · carnet · couple | ■ | — | ■ T-11 |
| B-71 | Newsreader | serif de lecture | m | 400 + italique | ville · éditorial · culture | ■ | — | ■ T-17, TW-2 |
| B-72 | Alegreya | serif humaniste | p | 400, 700 + italique | nature · île · famille | ■ | corps < 9,5 pt (petite hauteur d'x : 10 pt) | ■ T-13 |
| B-73 | Alegreya Sans | humaniste | p | 400, 500 | nature · famille | ■ | corps < 9,5 pt | ■ T-13 |
| B-74 | Hanken Grotesk | grotesque | m | 400, 500 | chic · éditorial · neutre | ■ | — | ■ T-01 |
| B-75 | Work Sans | grotesque | g | 400, 500 | rétro · pop · gourmand | ■ | corps > 9,5 pt | ■ T-08 |
| B-76 | Instrument Sans | grotesque | m | 400 | tendre moderne · mode | ■ | — | ■ T-02 |
| B-77 | Ysabeau | humaniste | m | 400 | voyage lumineux · MED | ■ | — | ■ T-03 |
| B-78 | Libre Franklin | grotesque | m | 400 | famille · classique chaleureux | ■ | — | ■ T-15 |
| B-79 | Barlow | grotesque | m | 400 | sport · route | ■ | — | ■ T-06 |
| B-80 | Crimson Pro | serif garalde | p | 400, 600 + italique | livre · calme · mariage · année de vie | OK | corps < 10 pt (petite hauteur d'x) | □ |
| B-81 | Spectral | serif | p | 300, 400, 600 + italique | NORD · nuit · calme · éditorial | OK | corps < 10 pt, texte blanc sur noir fin | □ |
| B-82 | Libre Baskerville | serif de transition | g | 400, 700 + italique | classique · famille · LATAM · rétro | OK | élégance légère (il est large et sombre) | □ |
| B-83 | Merriweather | serif robuste | g | 400, 700 + italique | lecture à l'écran · brut · AU · US | OK | corps > 9,5 pt (trop large) ; chic | □ |
| B-84 | Literata | serif de livre | m | 400, 500 + italique | NORD · livre · carnet · calme | OK | — | □ |
| B-85 | Vollkorn | serif de pain | m | 400, 600, 700 + italique | année de vie · famille · chaleureux | OK | chic froid, nuit | □ |
| B-86 | Karla | grotesque légère | m | 400, 500, 700 | AU · carnet · neutre · jeune | OK | chic éditorial | □ |
| B-87 | Figtree | grotesque ronde | g | 400, 500, 700 | neutre · pop doux · NORD · vacances | OK | corps > 9,5 pt | □ |
| B-88 | DM Sans | géométrique | m | 400, 500 | contemporain · pop doux | OK | **à éviter dans un magazine : c'est la police d'interface du site Bellajour, ce serait mettre la marque dans le magazine du client (même raison que Cormorant, décision du 12/11)** | □ |
| B-89 | Source Sans 3 | humaniste | m | 400, 600 + italique | neutre · tout usage | OK | — | □ |

**Décompte** : 89 familles. 30 déjà au catalogue (marquées ■ : B-01 à B-07, B-18, B-19, B-25, B-26, B-34, B-52, B-58, B-60 à B-63, B-68 à B-79), **59 nouvelles (□)**. Cormorant Garamond reste exclue (décision du 12/11).
Aboreto, Tenor Sans (B-33), Italiana, Ysabeau, Permanent Marker, Indie Flower, Mansalva que Mathias possède : nommées par leur version Google, jamais par son fichier.
Vérification que je n'ai pas pu faire : l'existence de chaque graisse en fichier statique dans `@fontsource/<id>` (le pipeline lit du TrueType statique, pas la police variable) :
à vérifier police par police au téléchargement ; une police variable seule demande une étape de plus (instanciation d'une graisse), à chiffrer avant d'y mettre un titre.

## 8. Ce qui serait de mauvais goût, et pourquoi (faux exotisme)

La règle : **on évoque un pays par la construction d'une lettre, jamais par sa caricature.** Une lettre « typique » est celle qu'on trouve sur l'enseigne d'un restaurant du pays
à l'étranger, pas celle que le pays lit chez lui. Elle fait sourire le client dont c'est le pays, et le client est souvent allé là-bas pour s'en faire un souvenir sérieux.

| Cas | À ne pas faire | Pourquoi | À la place |
|---|---|---|---|
| Japon, Chine | polices « chop suey » ou « wonton » (lettres latines faites de bâtons et de coups de pinceau qui imitent les caractères) ; faux katakana (M en 川, N en ﾑ) | cliché de restaurant des années 50-70, ridicule pour un lecteur japonais, et illisible en capitales accentuées | Shippori Mincho ou Zen Kaku Gothic New, beaucoup de blanc, un seul mot en grand |
| Japon | écrire du pseudo-japonais avec des glyphes décoratifs | un mot inventé est une faute, pas un ornement | si le client donne un mot japonais, le saisir tel quel (sous-ensemble `japanese`) |
| Maghreb, Moyen-Orient | polices « Arabian nights » à lettres en oignon ou pointes de turban, ou une police latine à terminaisons « arabesques » | caricature de dessin animé, offense la calligraphie réelle | Amiri, El Messiri, Cairo, Reem Kufi |
| Mexique, Amérique latine | polices à sombrero, papel picado, « Mexicano » | folklore de fête à thème | Abril Fatface ou Alfa Slab One pour les enseignes peintes réelles, Shrikhand pour le chaud |
| Grèce | lettres à Σ à la place des E, Π pour N | gag d'étudiant, perd les accents | Cinzel, Forum, Amatic SC (la vraie voix des tavernes) |
| Russie, Europe de l'Est | lettres à Я retourné, « fausse cyrillique » | cliché, et faux | une police neutre ; Œ et accents corrects |
| États-Unis, Australie | polices western (Rye, Sancreek, Smokum) pour « outback » ou « Far West » | l'Australie n'est pas le Far West ; costume | Oswald, Zilla Slab, Bitter : la signalétique des parcs et des routes |
| Australie | tout dessin imitant la peinture aborigène (points, motifs) ou « didgeridoo » | art sacré de peuples vivants, droits culturels ; jamais pour décorer | ne rien imiter ; si le client en parle, un texte simple |
| Polynésie, Asie du Sud-Est | polices « tiki », bambou, lettres en feuilles de palmier | tourisme de brochure | Prompt, Kanit, Quicksand ; la couleur et la photo font l'ailleurs |
| Tous | polices « de bateau » ou « d'aventure » à textures grunge, tampons déchirés | ne dit aucun lieu | une police nette et un bon sujet |
| Tous | **plus d'une police de caractère par magazine** | le pays ne s'évoque qu'une fois | R-T-45 |

Autre test, plus simple : **si on enlève le titre, le magazine dit-il encore le pays ?** S'il ne le dit que par la police, c'est de la déco, pas du fond.
