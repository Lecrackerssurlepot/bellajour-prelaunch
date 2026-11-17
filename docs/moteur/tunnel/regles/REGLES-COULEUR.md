# Règles de couleur : C-001 à C-063

Cahier du coloriste, tunnel du 17/11/2026. Reprend les 21 R-C et les 18 accords du cycle 0 (`cycle-0-2026-11-10/regles/couleur.md`),
le décideur de la démo (`couleurs.py`) et le code livré (`nuancier.ts`, `combos.ts`, `mesures.ts`). Rien n'est réécrit : ce qui existe est
cité (R-C-xx, A-xx, I-xx), ce qui manque est ajouté. Chaque règle : **énoncé · raison · exception · seuil · contrôle**.
Tous les seuils sont des **réglages de départ** : ils se calibrent sur les choix de Mathias, jamais des vérités.
Les nombres cités « sur Joëlle » viennent des scripts de `essais-couleur/` (164 photos, mesurées en local, rien envoyé).

Profils : **V** voyage en famille (Joëlle), **F** fête et nuit, **C** couple, **E** événement d'un jour, **A** année de vie.
Une règle sans mention vaut pour tous.

## 0. Le cadre

**L'espace : CIELAB, en coordonnées LCh (D65), écart ΔE00.** Choix fait pour trois raisons : tous les seuils déjà posés (R-C, I-xx) et tout le code livré
(`nuancier.ts`, `combos.ts`) sont écrits dans cet espace, en changer casserait 21 règles calibrées ; le ΔE00 est le seul écart perçu normalisé et
outillé (profil ICC, Affinity) ; la mesure d'impression (aller-retour FOGRA39) sort en Lab. Défaut connu : vers h 270 à 300° le bleu glisse vers le
violet quand on change la clarté. OKLCH est plus juste pour ça. **Remède retenu** : on mesure en LCh, et quand la machine FABRIQUE une couleur (assombrir
un accent, éclaircir un aplat) elle garde la teinte d'une couleur réelle et vérifie par ΔE00 ≤ 6 de sa source en teinte seule. À rouvrir si l'essai
imprimé montre un bleu qui vire. L = clarté 0 à 100 ; C = saturation (8 gris, 20 doux, 40 franc, 60 vif) ; h = teinte en degrés
(rouge 30, orange 60, jaune 90, vert 130, cyan 210, bleu 260 à 285, violet 300 et plus). Chaud : h de 0 à 110 ou 330 et plus. Froid : 150 à 300.
Neutre : C < 8.

**Le papier.** Quadri sur couché 130 g. Une couleur d'écran n'est pas une couleur imprimée : proxy de travail = profil FOGRA39 (Affinity), aller-retour
en rendu colorimétrique relatif. **Le profil réel de Cloudprinter reste à demander**, ainsi que leur limite d'encre totale. La finition (mat ou
brillant) change le contraste et la saturation perçus : aucun seuil ci-dessous n'est prouvé pour l'une ou l'autre sans épreuve physique.

**La limite d'impression mesurée** (saturation C la plus haute qui revient à ΔE00 ≤ 3 après aller-retour FOGRA39, minimum sur la tranche de 30° de teinte ; script `gamut-fogra39.py`) :

| clarté L \ teinte h | 0° | 30° | 60° | 90° | 120° | 150° | 180° | 210° | 240° | 270° | 300° | 330° |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 30 | 52 | 42 | 28 | 26 | 26 | 30 | 22 | 22 | 24 | 34 | 60 | 54 |
| 45 | 74 | 68 | 50 | 44 | 44 | 40 | 30 | 28 | 30 | 46 | 50 | 62 |
| 60 | 66 | 70 | 68 | 64 | 66 | 50 | 36 | 34 | 38 | 42 | 38 | 48 |
| 75 | 40 | 42 | 58 | 78 | 56 | 38 | 34 | 34 | 38 | 26 | 26 | 34 |
| 88 | 18 | 18 | 24 | 72 | 28 | 18 | 16 | 16 | 20 | 14 | 14 | 18 |

À lire : un bleu-cyan clair (h 210 à 270, L 60 à 75) ne dépasse pas C 26 à 38 à l'impression. Le ciel d'un téléphone récent est à C 38 à 49 : il sort du papier. Les
terres (h 0 à 90, L 45 à 60) vont jusqu'à C 65 sans perte. Rien n'est inventé au-delà de la grille : entre deux lignes, on prend la plus prudente.

## A. Prélever les couleurs des photos (C-001 à C-011)

**C-001 Des dominantes réelles, pas des moyennes.** Énoncé : chaque photo (vignette 200 px) passe en Lab, se regroupe en 5 amas (k-moyennes en Lab, départs
déterministes) ; chaque amas est représenté par un pixel RÉEL (le plus proche du centre). Raison : la moyenne d'un ciel bleu et d'un sable est un gris que personne n'a
vu (sur Joëlle, la moyenne naïve de chaque tranche tombe à #6d7079 … #7d7977, des gris ; les dominantes sont un bleu #729cd6, un grès #d4b589, un kaki #5f6445).
Exception : aucune. Seuil : 5 amas par photo, 6 teintes par tranche. Contrôle : aucune couleur du nuancier à ΔE00 > 10 d'un pixel réel d'au moins 2 photos.
(Le code livré fait ses k-moyennes en RGB : à passer en Lab, l'écart est faible mais le vert et le bleu se confondent moins.)

**C-002 Ce qu'on retire avant de compter** (R-C-02). Énoncé : peau (h 35 à 70, C 12 à 38, L 40 à 80, poids ×0,6, ou masque de personnes quand le tunnel le donne),
blancs brûlés (L > 97), noirs bouchés (L < 5), captures d'écran, emojis, photos filtrées (tag), lumière artificielle totale (néon, scène : C moyen > 60), photos d'un
même doublon ou d'une même rafale (une voix). Raison : la peau rend tous les nuanciers beige rose ; une capture impose son interface. Exception : profil F, la lumière de scène
EST le sujet : ces photos votent pour la nuit, pas pour le jour (C-056). Seuil : au-delà de 60 % de pixels retirés, la photo ne vote pas. Contrôle : part retirée par photo.

**C-003 Une photo, un vote plafonné.** Énoncé : score d'une teinte = Σ (surface × poids de la photo) + 0,15 par photo où elle revient ; poids : couverture ×4, ouverture ou pleine page ×2,
autre ×1 ; aucune photo ne pèse plus de 6 % du score total. Raison : un panorama d'aquarium indigo (C 105, 27 % d'une photo) ne doit pas fabriquer le nuancier d'un voyage
de 164 photos. Exception : aucune. Seuil : plafond 6 %. Contrôle : part du score de la plus lourde photo.

**C-004 Des familles de teinte à 12°.** Énoncé : les couleurs retenues (C ≥ 8, 5 < L < 97) se regroupent à 12° de teinte ; la teinte de la famille est celle de sa couleur réelle la plus lourde ;
poids d'une couleur = rang dans la palette (1 ; 0,67 ; 0,5 ; 0,4 ; 0,33) × ombre (nul sous L 22, plein dès L 34) × clair (plein jusqu'à L 90, nul à 97) × franchise ((C − 8) / 22, plafonné à 1).
Raison : c'est le calcul livré (`REGLAGES_NUANCIER`), il évite les ombres brunes et les papiers presque blancs. Exception : bleu et cyan, famille à 15°
(le bleu est plus étalé en h). Seuil : une teinte entre au nuancier si elle est dans au moins 2 photos et fait ≥ 3 % du score. Contrôle : nombre de familles, parts.

**C-005 Les neutres se comptent à part.** Énoncé : part des pixels à C < 8 par photo, puis moyenne par tranche. Si la moyenne dépasse 0,75 ou s'il reste moins de 2 familles chromatiques
à ≥ 3 %, le magazine est à A-01 papier seul (C-035). Raison : un gris ne fait pas un aplat, on ne force pas une couleur sur des photos sans couleur. Exception : le client en impose une (C-011).
Seuil : 0,75. Contrôle : sur Joëlle, la part de neutres par tranche est 0,39 à 0,52 : le lot a de la couleur.

**C-006 Les accents se cherchent à part, sur les petites surfaces.** Énoncé : pixels à C ≥ 42, L 25 à 85, hors bleus de ciel (h 240 à 295) et hors verts de feuillage (h 95 à 150, C < 55),
sur 0,4 à 30 % de la photo ; familles à 15°, classées par nombre de photos. L'accent du magazine est la famille qui revient dans ≥ 2 photos, la plus franche. Raison : l'objet récurrent
(veste, enseigne, bâche) fait l'histoire, la dominante fait la surface (R-C-04). Exception : une famille d'une seule photo ne passe que si elle est celle de la couverture. Seuil : ≥ 2 photos.
Contrôle : sur Joëlle, jaune moutarde h 86 (8 photos), brique h 41 (7), or h 75 (7), orange h 57 (5).

**C-007 Le ciel et la mer se reconnaissent, et ne sont jamais la source d'un aplat sourd.** Énoncé : un pixel est « ciel » s'il est dans le tiers haut du cadre, h 185 à 295, C ≥ 15, L ≥ 45 ; une
famille bleue qui revient dans ≥ 15 % des photos est du ciel ou de la mer (présomption du code livré). Elle sert l'aplat CLAIR (C-015) et le fond de la nuit, pas l'aplat sourd collé à une photo de ciel
(C-047). Raison : l'aplat sourd bleu à côté d'un ciel est le défaut le plus fréquent du corpus (Candice int-06, ΔL −27, ΔC ×1,8). Exception : l'objet héros est de ce bleu (A-12). Seuil : 15 %.
Contrôle : part « ciel » par photo (Joëlle : médiane 0,11, 5e au 95e centile 0 à 0,89).

**C-008 Un sous-nuancier par tranche, un nuancier au-dessus** (R-C-09). Énoncé : on calcule les dominantes de chaque tranche (jours, lieu, chapitre) ET du magazine entier ; chaque chapitre prend
son aplat DANS le nuancier du magazine, la famille la plus proche de la dominante du chapitre. Raison : un voyage change de lumière ; il n'a pas à changer de main. Exception : un chapitre
nocturne a son sous-nuancier propre (C-056). Seuil : ΔE00 entre l'aplat du chapitre et la dominante du chapitre : le plus petit du nuancier. Contrôle : l'écart, rapporté.

**C-009 Un tri avant l'accord : le lot est-il cohérent ?** Énoncé : on compte les teintes vives (amas C ≥ 45, ≥ 2 % d'une photo, distants de ≥ 30°) sur tout le lot. Plus de 4 : le nuancier est
calculé sur la famille dominante seule et le reste ne produit qu'un accent (C-010). Raison : les lots hétérogènes font des nuanciers arc-en-ciel. Exception : A-14 double pop. Seuil : 4.
Contrôle : nombre de familles vives.

**C-010 Quand les photos ne disent rien.** Énoncé : moins de 2 familles chromatiques, ou C moyen du lot < 10, ou plus de 60 % de photos filtrées ou capturées : on propose A-01 papier seul + encre,
sans aplat, et un seul accent pris dans le lot s'il existe. Raison : il vaut mieux un magazine blanc qu'un aplat posé. Exception : aucune. Seuil : C moyen 10. Contrôle : le message affiché dit
« pas de couleur à reprendre ».

**C-011 Ce que le client dit prime.** Énoncé : une couleur saisie (« le bleu du mariage », fiche de projet) devient la famille dominante, même si les photos ne la portent pas ; la règle I-05
« teinte étrangère » est alors levée pour cette seule teinte, et elle reste soumise à la limite d'impression (C-045) et au contraste (C-051). Raison : le lilas de Merisa était peut-être voulu (cycle 0 §7).
Exception : aucune. Seuil : une couleur imposée par magazine. Contrôle : champ saisi, rapporté dans l'accord.

## B. Les rôles (C-012 à C-022)

Un nuancier = 6 rôles + 1 : **papier, encre, aplat clair, aplat sourd, accent, nuit** (livrés) et **accent de nuit** (nouveau). Les gabarits ne connaissent que des rôles. Les formules ci-dessous
sont celles de `nuanciers-joelle.py`.

**C-012 Papier.** Énoncé : blanc du papier. Un crème n'est permis que si le lot est chaud (≥ 0,45 de chaud) et que le crème est à ΔE00 ≥ 7 du blanc (R-C-30) ; sinon blanc. Raison : un crème
plus proche se lit « blanc sale » ; et sur un papier blanc, un « papier crème » est une teinte imprimée sur chaque page, donc de l'encre et un repérage à tenir. Exception : A-04 terre sourde, accord
où le crème est signé. Seuil : ΔE00 ≥ 7 (testé sur Joëlle : #faf6ee 4,3 refusé, #f6f0e4 6,4 refusé, #f3ebdc 8,0 accepté). Contrôle : ΔE00 au blanc, encre totale.

**C-013 Encre.** Énoncé : L 15 à 20, C ≤ 6, teinte de la famille dominante ; titres, aplats de nuit, légendes (texte courant : noir seul, C-050). Raison : un noir teinté s'accorde, un noir pur
tranche (C-052). Exception : aucune. Seuil : L 18 par défaut. Contrôle : contraste de l'encre sur le papier ≥ 12:1, encre totale ≤ 300 % (C-046).

**C-014 Aplat sourd.** Énoncé : teinte réelle de la famille dominante ; L 38 à 60 ; C = min(0,85 × C de la famille, 48, limite d'impression à cette teinte et clarté). Raison : l'aplat recule derrière sa source
(R-C-06) ; au-dessus de la limite il imprimera plus terne que prévu. Exception : un objet héros franc (A-12) peut aller à C de l'objet. Seuil : chiffres livrés (`REGLAGES_COMBOS`). Contrôle : C aplat ≤ C source ;
ΔE00 écran contre imprimé ≤ 3.

**C-015 Aplat clair.** Énoncé : même teinte que l'aplat sourd (ou celle du ciel : « ciel prolongé »), L 88 à 90, C ≤ 16 ; refusé si ΔE00 au papier < 5 (alors L 80) ou si l'encre totale < 15 %. Raison :
c'est l'aplat de page faible en photos et le seul qu'on pose à côté d'un ciel (C-047). Exception : aucune. Seuil : ΔE00 ≥ 5. Contrôle : ΔE00 au papier, ΔE00 au ciel voisin.

**C-016 Accent.** Énoncé : famille d'accent de C-006, teinte réelle ; C 25 à 45 ; L ≤ 50 sur papier blanc ; usage : un mot, un folio, un filet, une légende de numéro. Jamais un aplat, jamais un texte courant.
Raison : la touche (R-C-05). Exception : double pop (C-038). Seuil : voir C-017. Contrôle : surface d'accent par double ≤ 10 %.

**C-017 L'accent se désature puis s'assombrit jusqu'au contraste.** Énoncé : C_accent = 0,7 × C de la famille (R-61), puis L baissé par pas de 2 jusqu'à ce que le contraste sur le papier atteigne 4,5:1
(petit texte) ou 3:1 (titre, corps ≥ 18 pt). Raison : sans cela l'accent est trop vif ou ne se lit pas (Eloise int-04 : 2,6:1). Exception : aucune. Seuil : 4,5 ; 3. Contrôle : contraste calculé sur la couleur
IMPRIMÉE (aller-retour FOGRA39), pas sur celle de l'écran. Sur Joëlle : ocre h 75 → #956a2a, 4,8:1.

**C-018 Nuit.** Énoncé : noir composé, teinte de la photo la plus sombre du lot (R-C-28), L de 11 au plus bas, remonté d'un point à la fois jusqu'à une encre totale ≤ 300 % ; C ≤ 6. Raison : 0/0/0 converti = 329 %
d'encre et ΔE00 6,5 (mesuré) ; un noir de la teinte des ombres de la photo ne forme pas de trou. Exception : aucune. Seuil : 300 % est un réglage de départ, **la limite de l'imprimeur est à demander**. Contrôle :
encre totale, ΔE00 aller-retour. Sur Joëlle : noir des photos de soir h 20, C 2 (neutre chaud) ; pas de bleu nuit.

**C-019 Accent de nuit.** Énoncé : sur la nuit, le texte coloré est l'accent éclairci : L ≥ 55, C = 0,85 × C de la famille, monté par pas de 2 jusqu'à 4,5:1 sur la nuit (7:1 sous 9 pt). Raison : un accent du jour sur du noir s'éteint
(I-02 : deux encres lourdes). Exception : aucune. Seuil : 4,5 ; 7. Contrôle : contraste sur la couleur imprimée. Sur Joëlle : ocre #bd8635 sur nuit, 4,6:1.

**C-020 Le blanc du papier est aussi un rôle.** Énoncé : le texte sur nuit ou sur aplat sourd sombre (L ≤ 55) est le papier non imprimé (réserve). Raison : seul le papier donne 14:1 ; un blanc « imprimé » n'existe pas.
Exception : à l'impression, un corps fin en réserve sur une photo en quatre encres peut se boucher (R-C-25) : corps minimal à fixer au premier BAT. Seuil : aplat L ≤ 55. Contrôle : contraste papier sur aplat.

**C-021 Peu de couleurs hors photo.** Énoncé : au plus 2 couleurs d'habillage par double (hors papier, encre, photos), au plus 6 par magazine (R-P-12). Raison : au-delà, on sent deux mains.
Exception : aucune. Seuil : 2 ; 6. Contrôle : décompte sur le rendu.

**C-022 Palette fermée.** Énoncé : au plus 2 familles d'aplat (dominante, secondaire) + nuit + papier (R-C-07). Raison : Klervie en a deux, on sent une main ; Eloise en a trois, trois habillages. Exception : aucune.
Seuil : teintes d'aplat à ΔE00 > 10 entre elles ≤ 2. Contrôle : décompte.

## C. Les parts (C-023 à C-027)

**C-023 La part de chacune sur une double** (R-C-05). Énoncé : hors photos, papier ≥ 60 %, aplat ou secondaire ≤ 30 %, accent ≤ 10 %. Raison : un chef, un second, une touche. Exception : page de citation
ou ouverture de chapitre : aplat jusqu'à 100 % de la page (un seul côté de la double sauf C-048). Seuil : 60/30/10. Contrôle : surfaces par rôle sur le rendu.

**C-024 Sur le magazine : une dominante, une secondaire, une touche.** Énoncé : la famille dominante donne environ deux aplats sur trois, la secondaire le reste, l'accent aucun. Raison : lisibilité d'une ligne de couleur.
Exception : un chapitre nocturne (C-056). Seuil : 2/3 ± 15 points. Contrôle : doubles à aplat de la dominante ÷ doubles à aplat.

**C-025 Au plus une double sur trois a un aplat.** Énoncé : doubles à aplat ÷ doubles ≤ 0,33 (profil F : 0,5 ; profil V : 0,25). Raison : un signal qui est partout ne signale plus rien (Candice : 8 sur 23). Exception :
aucune. Seuil : voir profils (§K). Contrôle : compteur.

**C-026 Jamais deux doubles à aplat de suite.** Énoncé : entre deux aplats, au moins une double au papier. Raison : l'aplat est une respiration, pas un décor. Exception : ouverture de chapitre suivie d'une page de
citation. Seuil : 1 double d'écart. Contrôle : compteur.

**C-027 Pas plus de trois teintes vives sur une double** (I-08). Énoncé : amas C ≥ 45, ≥ 2 % de la double (photos comprises), distants de ≥ 30° de teinte : au plus 3. Raison : au-delà, arc-en-ciel. Exception :
profil F, les effets de couleur d'un filtre (néon, lueur) comptent pour UNE teinte. Seuil : 3. Contrôle : décompte sur le rendu de la double ; sur Joëlle, un seul cas : l'aquarium (indigo, magenta, corail).

## D. Les accords (C-028 à C-038)

**C-028 Un accord par magazine, nommé, choisi par une table.** Énoncé : la machine retient le premier accord de la table ci-dessous dont toutes les conditions sont vraies, le nomme en une phrase et l'affiche
(R-C-10). Ordre : C-035, C-033, C-031, C-030, C-032, C-034, C-029. Raison : un nom (« bleu océan et grès ») tient la cohérence. Exception : C-011. Seuil : conditions ci-dessous. Contrôle : accord affiché.
Notation : Δh = écart de teinte entre deux familles ; dom = famille de plus fort score ; sec = la suivante qui revient dans ≥ 2 photos.

**C-029 Ton sur ton.** Énoncé : une seule famille (toutes les teintes d'aplat à h ± 8°), trois clartés : aplat clair L 90, aplat sourd L 50, encre L 18 ; accent = la même famille à L 40. Condition : part de dom ≥ 0,9.
Raison : calme, mer, montagne, neige. Exception : aucune. Seuil : 0,9. Contrôle : écart de teinte maximal des rôles ≤ 16°.

**C-030 Analogues.** Énoncé : dom et sec à Δh ≤ 45° ; un troisième voisin permis dans les mêmes 45° ; aplat sourd = dom, aplat clair = sec en version L 90. Raison : harmonie facile (terres, verts, heure dorée A-06,
lande A-16). Exception : aucune. Seuil : Δh ≤ 45°, C ≤ 35 pour le sec. Contrôle : Δh. Joëlle : olive h 118 et grès h 78, Δh 40°.

**C-031 Complémentaire adoucie** (A-05). Énoncé : dom et sec à Δh de 150 à 210° ; tous deux C ≤ 35 (sinon plafonnés) ; l'un sert les aplats, l'autre l'accent (≤ 10 % de la surface de l'autre). Raison : le contraste de teinte
sans le cri (I-07). Exception : un lot qui porte déjà deux surfaces franches (A-14). Seuil : Δh 150 à 210° ; C ≤ 35. Contrôle : Δh, C, parts. Joëlle : bleu h 272, grès h 75, Δh 197°.

**C-032 Triade douce.** Énoncé : trois familles à ≈ 120° l'une de l'autre (± 25°), toutes C ≤ 28 ; une seule domine (≥ 0,55 du score) ; les deux autres ne sont que aplat clair et accent. Raison : richesse sans bruit si les
deux « autres » sont petites et pâles. Exception : un lot qui ne trace pas ces trois teintes n'a pas de triade, on n'en fabrique pas. Seuil : ± 25° ; 0,55. Contrôle : Δh à 120. Joëlle : non applicable (aucune troisième famille
à h ≈ 32 ou 152 qui revienne dans 2 photos).

**C-033 Monochrome avec une touche** (A-02). Énoncé : une famille sur ≥ 80 % de la surface colorée (Δh < 30°), un accent à Δh ≥ 120° sur ≤ 5 %. Raison : limpide. Exception : aucune. Seuil : 0,8 ; 5 %. Contrôle :
part de dom, surface d'accent.

**C-034 Température commune.** Énoncé : toutes les familles retenues sont chaudes (h 0 à 110, 330 et plus) ou toutes froides (h 150 à 300) ; l'accent peut changer de température, à ≤ 5 % de la surface. Raison : l'œil lit une double
« chaude » ou « froide » avant de lire une teinte (I-06). Exception : A-05, où la complémentarité est voulue. Seuil : 5 %. Contrôle : part chaud/froid de chaque rôle.

**C-035 Papier seul** (A-01). Énoncé : aucun aplat ; texte encre ; un accent petit s'il existe. Conditions : C-005 ou C-010 ou plus de 4 teintes vives (C-009) ou températures mêlées (C-041). Raison : le plus sincère.
Exception : aucune. Seuil : voir ces règles. Contrôle : zéro aplat sur le rendu.

**C-036 Duotone d'unification** (A-15). Énoncé : un groupe de photos faibles (hôtel, nuit, flou, 4 photos ou plus d'un même moment) passe en encre + une teinte du nuancier (filtre F26) et prend le même aplat ou titre. Raison : la couleur
d'un lot hétérogène se règle par l'étalonnage, pas par un aplat. Exception : aucune. Seuil : ≥ 4 photos, ≥ 50 % sous C moyen 10 ou d'éclairages mêlés. Contrôle : écart de teinte entre le duotone et le nuancier ≤ 10°.

**C-037 Écho de l'objet héros** (A-12). Énoncé : un aplat à ΔE00 ≤ 6 d'un objet (≥ 5 % de la photo, récurrent ou unique en couverture), une fois par magazine. Raison : « l'aplat est une grande surface unie de la photo d'en face ». Exception :
aucune. Seuil : ΔE00 ≤ 6 ; C aplat ≤ C objet. Contrôle : ΔE00 aplat à la zone de la photo.

**C-038 Double pop** (A-14). Énoncé : deux aplats francs (C ≥ 50), pris à la photo, une fois par magazine, sur photos N&B ou exactement de ces couleurs. Profil F, E : permis ; profil V, C : demandé par le client seulement.
Raison : la joie de magazine. Exception : aucune. Seuil : une fois. Contrôle : compteur ; limite d'impression (C-045) : un aplat plus vif que la table est imprimé plus terne : on montre la version imprimée.

## E. Les interdits de saturation et de température (C-039 à C-044)

Ce sont les I-xx du cycle 0, chiffrés et rangés dans l'ordre où la machine les vérifie (le premier qui échoue est affiché en une phrase).

**C-039 Saturation contre saturation** (I-07). Énoncé : deux zones à C ≥ 45, > 5 % de la page chacune, Δh ≥ 30°, sans que l'une fasse < 10 % de l'autre : interdit. Raison : ça crie, rien ne respire. Exception : A-14. Remède :
papier sous la photo vive, ou une des deux plus petite. Contrôle : zones C ≥ 45 sur le rendu.

**C-040 Aplat plus vif que sa source, ou décalé** (I-03, I-04). Énoncé : C aplat ≤ C source (× 1,4 toléré sur une bande d'un tiers de page, jamais en pleine page) ; Δh aplat-source ≤ 10° (un décalage entre 10 et 30° est le pire : l'œil lit une erreur). Raison :
mesuré sur le corpus (Merisa int-13 : +4 L, ×0,64 C, 8° marche ; Candice int-06 : −27 L, ×1,8 C, 30° écrase). Exception : l'objet héros (C-037). Seuil : 10° ; ×1,4. Contrôle : L, C, h de l'aplat contre la zone source.

**C-041 Aplat chaud sous photo froide, et l'inverse** (I-06). Énoncé : un aplat chaud (h 0 à 110, C ≥ 15) quand > 60 % des pixels colorés des photos posées dessus sont froids et que sa teinte y fait < 3 % : interdit ; idem inverse. Raison : la
photo paraît sale ou glacée. Exception : A-05, si le chaud fait ≤ 10 % de la surface. Remède : l'aplat prend la température des photos, ou le papier. Contrôle : part chaud/froid des pixels des photos de la double.

**C-042 Températures de photos mêlées** (I-10). Énoncé : deux photos d'une double dont la dominante des quasi-neutres (pixels C < 12, L 30 à 85) diffère de ≥ 8 en b* : pas d'aplat dessous ; alignement par filtre (F-005) ou N&B (C-063). Raison : « deux pages qui ne viennent
pas du même jour ». Exception : une scène éclairée par une couleur voulue (coucher de soleil, scène). Seuil : b* ≥ 8 (équivaut à environ 1 500 K, ordre de grandeur, non prouvé). Contrôle : b* neutres de chaque photo. Sur Joëlle, σ de b* neutres = 3,5 : aucune double mêlée par accident.

**C-043 Deux contrastes forts sur une double** (I-09). Énoncé : au plus un parmi : clair-obscur (≥ 15 % de la double à L < 20 et ≥ 15 % à L > 90), couleur en soi (aplat C ≥ 45 sur ≥ 20 %), chaud-froid (deux zones ≥ 15 %,
températures opposées, C ≥ 30). Raison : ça se dispute. Exception : aucune. Remède : garder le contraste qui sert la photo. Contrôle : trois mesures.

**C-044 Teinte étrangère** (I-05). Énoncé : un aplat à ΔE00 > 15 de tous les amas du nuancier : refusé (« papeterie »), remplacé par la famille la plus proche. Raison : mesuré sur le lilas de Merisa, le vieux rose de Lara. Exception : C-011. Seuil : ΔE00 15.
Contrôle : ΔE00 minimal au nuancier.

## F. Quand un fond de couleur sert une double, et quand il la tue (C-045 à C-049)

**C-045 Limite d'impression.** Énoncé : aucune couleur d'aplat, de titre ou de filet ne dépasse la limite de la table du §0 pour sa teinte et sa clarté ; au-delà, la machine montre la couleur IMPRIMÉE (jamais celle de l'écran) ou prend la plus proche
qui tient. Raison : bleu électrique C 92 → 47, ΔE00 9,9 ; fluo n'existe pas en quadri. Exception : photos (on ne touche pas aux photos ici, voir F-003). Seuil : ΔE00 aller-retour ≤ 3. Contrôle : ΔE00 aller-retour FOGRA39 (proxy).

**C-046 Encre totale.** Énoncé : somme CMJN d'un aplat ≤ 300 % (réglage de départ) ; noir composé C-018 ; filet fin et petit texte : noir seul ou deux encres au plus. Raison : séchage, repérage, bavure d'un filet en quatre encres. Exception : photo. Seuil : 300 %, à confirmer
avec l'imprimeur. Contrôle : somme au profil.

**C-047 Un aplat bleu contre un ciel bleu : prolonge ou tue.** Énoncé : un aplat est **admis** contre une photo à ciel (≥ 25 % de ciel) s'il est PLUS CLAIR que le ciel (ΔL ≥ +8), MOINS saturé (C aplat ≤ 0,7 × C ciel) et à Δh ≤ 10° : c'est le ciel prolongé (A-03). Il est **interdit** s'il est plus sombre (ΔL < 0) ou
plus saturé, ou décalé de 10 à 30° : le vrai ciel paraît délavé (contraste simultané). Raison : Candice int-06 (aplat L 54, C 51, h 281° contre ciel L 81, C 28, h 251°) ; Merisa int-13 (L 81, C 18 contre L 77, C 28) marche. Exception : l'objet héros bleu (C-037). Remède : passer à l'aplat clair, ou au papier.
Seuil : +8 ; 0,7 ; 10°. Contrôle : L, C, h du ciel voisin (C-007). Sur Joëlle : ciel L 64 à 70, C 34 à 38, h 271 : l'aplat clair #d6e4f5 (L 90, C 10, h 262, +20 L, ×0,27 C, 9°) passe ; l'aplat sourd #5679a8 (L 50) ne passe pas contre ce ciel.

**C-048 Pleine double seulement si toutes les photos sont de la couleur** (R-C-21). Énoncé : aplat sur les deux pages seulement si la dominante de chaque photo posée est à Δh ≤ 15° de l'aplat ; sinon une page, ou une bande d'un tiers. Raison : Klervie brique sur photos brique marche en grand ; Eloise int-20 non. Exception : aucune.
Seuil : 15°. Contrôle : Δh par photo.

**C-049 Photo très saturée, fond calme.** Énoncé : une photo à C ≥ 60 sur ≥ 15 % de sa surface (aquarium, néon, fleurs) ne reçoit ni aplat vif ni accent de la même zone : papier ou nuit seulement. Raison : « photo vive sur fond calme, ou fond vif sous photo calme : jamais les deux ». Exception : A-14. Seuil : C 60 ; 15 %.
Contrôle : surface à C ≥ 60. Sur Joëlle : l'aquarium (058, 059 : indigo h 300 à 307, C 78 à 108) est hors limite d'impression (≈ 38 à 50) : papier ou nuit, et la photo sera plus terne sur le papier (F-003).

## G. Le texte et son contraste (C-050 à C-055)

**C-050 Texte courant et légendes : l'encre, rien d'autre.** Énoncé : le corps de texte et les légendes sont en noir seul (une encre, C-018 pour la teinte) ; la couleur est permise sur un titre, un folio, un numéro de légende, un mot d'attaque. Raison : la couleur d'un texte se lit comme un signal ; en quadri,
un petit texte en quatre encres se dédouble si le repérage bouge. Exception : aucune. Seuil : corps < 12 pt noir seul. Contrôle : couleur des blocs de texte.

**C-051 Contraste minimal, calculé sur l'imprimé.** Énoncé : texte ≥ 4,5:1 (petit), titre ≥ 3:1 (corps ≥ 18 pt), texte sous 9 pt sur nuit ≥ 7:1 ; et ΔL ≥ 45 entre texte et fond pour un petit texte. Raison : le contraste WCAG est un proxy de l'écran ; le papier couché mat ou brillant le fait varier.
Exception : texte décoratif (grand mot-titre ≥ 60 pt) ≥ 2,5:1 s'il est lu autrement (couverture). Seuil : 4,5 ; 3 ; 7 ; ΔL 45. Contrôle : contraste de la couleur imprimée. Cas mesuré : blanc sur aplat sourd bleu #5679a8 = 4,5:1, limite ; blanc sur bleu ciel de Lara 1,6:1 : illisible.

**C-052 Pas de noir pur sur une photo, et pas de noir pur nulle part.** Énoncé : texte, filet, cadre, ombre posés sur ou contre une photo : le ton le plus sombre de la photo (L 10 à 20, C ≤ 8), jamais 0/0/0. Raison : les noirs d'une photo ne sont jamais purs ; à côté, un noir pur se lit comme un trou (R-C-28). Exception :
aucune. Seuil : aucun pixel d'habillage à L < 5 en contact avec une photo. Contrôle : L minimal de l'habillage.

**C-053 D'où vient la couleur d'un texte.** Énoncé : un titre prend (a) l'encre, (b) le papier, ou (c) l'accent du magazine ; une seule couleur de texte pour tout le magazine ; seul un titre court posé DANS une photo peut prendre une couleur de CETTE photo, désaturée de 20 à 40 %, assombrie jusqu'au contraste de C-051.
Sur papier blanc, un titre coloré a L ≤ 55. Raison : le titre rouge de Marjorie (L 42, 6:1) se lit ; le lavande d'Eloise (2,6:1) s'efface. Exception : aucune. Seuil : L ≤ 55 ; désaturation 0,6 à 0,8. Contrôle : écart de teinte entre le titre et la photo ≤ 15° (ou l'accent).

**C-054 Texte blanc sur photo.** Énoncé : seulement si les 10 % de pixels les plus clairs sous le texte (avec marge) ont L ≤ 55 et peu de texture ; sinon voile local ou texte hors photo. Sur aplat : seulement si l'aplat a L ≤ 55. Raison : R-C-25 (blanc sur lavande 2,8:1, sur bleu ciel 1,6:1).
Exception : aucune. Seuil : p90 de L ≤ 55. Contrôle : contraste du blanc contre le 90e centile de clarté de la zone.

**C-055 Un texte sur l'aplat clair est l'encre ou l'accent plein.** Énoncé : sur aplat clair (L 88 à 90), texte encre ; l'accent seulement s'il tient 3:1 en titre (cas mesuré : ocre #956a2a sur #d6e4f5 = 3,7:1, titre seulement ; brique #8d4836 sur #f1e0c8 = 5,2:1). Raison : l'aplat clair a peu de contraste de lui-même. Exception :
aucune. Seuil : 3 ; 4,5. Contrôle : contraste de la paire.

## H. La nuit, le noir, le blanc (C-056 à C-059)

**C-056 Quand passer au noir.** Énoncé : un fond de nuit (C-018) est permis sur un chapitre ou une double quand une de ces conditions est vraie : (a) la majorité des photos sont de nuit : L médian ≤ 40, ou ≥ 15 % des pixels sous L 25 avec L médian ≤ 55 (réglé sur les couchers de soleil de Joëlle : 16 à 23 % de pixels sous L 25, L médian 41 à 51 ; un seul lot, à recaler) ;
(b) l'heure locale est après le coucher du soleil moins 30 minutes (tag du tunnel) ; (c) la série est en N&B (C-063) ; (d) profil F, le chapitre est marqué soirée. Jamais sous une photo de plein jour (L médian > 55 et ciel ≥ 25 %). Raison : le noir a la valeur et la température des photos (Candice int-13, Eloise int-24, Lara int-03). Exception : profil F,
une photo de jour posée comme « flash » sur un fond de nuit si elle a un bord (C-058). Seuil : voir (a) à (d). Contrôle : L médian, part sous L 25, heure.

**C-057 Le noir comme profil F : effets de couleur sans cri.** Énoncé : sur fond de nuit, profil F : les photos portent l'effet (filtres F26 à F29 : duotone, néon, nuit bleue, lueur), le fond reste le noir composé ; au plus 1 effet de couleur par double ; au plus 3 teintes vives (C-027, l'effet compte pour une) ; titre papier ou accent de nuit (C-019) ; aucun aplat de couleur vif sous
une photo à effet. Raison : sur noir, les couleurs d'une photo chantent, mais deux effets se mangent. Exception : A-14. Seuil : 1 ; 3. Contrôle : décompte d'effets, teintes vives. Limite d'impression : les néons (C 80 à 100) seront plus ternes que l'écran (C-045, F-003) ; on le dit.

**C-058 Une photo sur du noir a un bord.** Énoncé : si l'écart ΔE00 entre la bande extérieure de la photo (3 % de sa largeur) et le fond est < 15, on pose un filet clair fin (papier ou accent de nuit) ou un passe-partout ; épaisseur unique pour le magazine, à fixer au premier BAT. Raison : une photo de nuit sur du noir se dissout (I-11, Lara int-11). Exception :
photo pleine page. Seuil : ΔE00 15 ; teinte à moins de 15°. Contrôle : ΔE00 bord / fond.

**C-059 Quand laisser blanc.** Énoncé : on ne pose pas d'aplat (papier seul) dans l'un de ces cas : lot cohérent à photos pleines de couleur (profil V, grandes photos : le papier laisse respirer) ; double déjà portée par une pleine page de couleur franche différente ; photos de températures mêlées (C-042) ;
photos à C ≥ 60 (C-049) ; moins de 2 photos à ciel de même clarté ; page de photos ≥ 50 % de la surface. Raison : le papier est la couleur la plus chère à bien choisir. Exception : ouverture de chapitre (C-060). Seuil : voir cas. Contrôle : règles C-049, C-042, C-025.

**C-063 Le noir et blanc** (R-C-29). Énoncé : toute une série en N&B, jamais une photo au hasard : une page entière, ou des vignettes N&B sur une photo couleur presque monochrome. Quand : (1) températures irréconciliables sur une double (C-042) ; (2) bruit, nuit ; (3) photos filtrées, captures, emojis ; (4) accord A-10 (N&B + un rouge h 25 à 40, C ≥ 55,
pour les titres seulement) ; (5) la couleur d'une photo est laide et l'émotion est le sujet. Jamais une photo N&B à côté d'une photo couleur vive de même taille. Un seul ton de N&B pour le magazine (neutre ou légèrement chaud, filtres F21 à F24). Raison : le N&B enlève une voix et fait chanter la seule couleur restante. Exception : aucune. Seuil : série ≥ 4 photos ;
saturation moyenne des voisines < 20. Contrôle : surface N&B ÷ surface couleur de la page. À l'impression un gris en quatre encres peut virer au vert ou au magenta : on convertit avec une forte part de noir (à vérifier à l'épreuve).

## I. La place (C-060 à C-062)

**C-060 Où va un aplat** (R-C-20). Énoncé : seulement (1) à l'ouverture d'un moment ou chapitre, (2) sur une page faible en photos (une photo ou moins, ou photos < 50 % de la page), (3) sur une page de texte, de citation ou de sommaire. Jamais deux de suite (C-026) ; au plus une double sur trois (C-025) ; jamais en face d'une pleine page de
couleur franche différente. Raison : l'aplat est une respiration ou un signal. Exception : aucune. Seuil : 50 %. Contrôle : position dans l'arc, surface photo de la page. Taille de l'aplat : pleine double (C-048), page, ou bande d'un tiers ; toujours UNI (ni dégradé, ni grain, ni motif : R-P-13).

**C-061 Bordures, passe-partout, filets** (R-C-22, R-C-26). Énoncé : bord blanc par défaut, épaisseur unique pour le magazine, posé quand ΔE00 entre la bande extérieure de la photo et le fond < 15 ; sinon pas de bord. Filets : une seule couleur de filet pour tout le magazine (l'accent, ou l'aplat sourd) ; épaisseur constante ; noir seul ou deux encres au plus. Bord noir épais :
seulement autour d'une photo à dominante totale (scène). Raison : le filet est la plus petite surface de couleur, c'est là que l'accent est le plus juste (Klervie int-08). Exception : aucune. Seuil : ΔE00 15. Contrôle : nombre de couleurs de filet ≤ 1.

**C-062 Une signature chromatique par chapitre, des constantes sur le magazine.** Énoncé : constantes de tout le magazine : papier, encre, accent, couleur de filet, couleur de texte (C-053). Variable par chapitre : l'aplat (dominante ou secondaire du magazine, C-008). Un changement d'aplat se fait à une ouverture de chapitre, jamais au milieu, et passe par une double au papier si Δh entre les deux aplats est > 90°. Raison : l'unité est ce qui fait « un magazine » ;
la variation fait respirer. Exception : le sous-nuancier de nuit (C-056) peut changer l'encre en nuit. Seuil : Δh 90°. Contrôle : aplats distincts ≤ 2 ; constantes identiques d'une page à l'autre. Lien avec les filtres : le filtre de magazine doit pencher vers le nuancier (virage de lumières vers la teinte de l'accent, F-002).

## K. Les profils (réglages de départ)

| Règle | V voyage famille | F fête, nuit | C couple | E événement d'un jour | A année de vie |
|---|---|---|---|---|---|
| Doubles à aplat (C-025) | ≤ 1 sur 4 | ≤ 1 sur 2 | ≤ 1 sur 3 | ≤ 1 sur 3 | ≤ 1 sur 3, un aplat par saison |
| Nuit (C-056) | seulement les soirs réels | oui, fond principal des chapitres « soirée » | si photos de nuit | si la soirée existe | un chapitre par saison au plus |
| C aplat maxi (C-014) | 35 | 55 sur nuit seulement | 30 | 40 | 35 |
| Accords préférés | C-031 puis C-030 | A-08 nuit et or, A-14 double pop | C-033, A-10 N&B + rouge | C-034, A-18 noir or blanc | C-008 : un sous-nuancier par saison |
| Teintes vives par double (C-027) | 3 | 3, effets comptés pour 1 | 2 | 3 | 3 |
| N&B (C-063) | série de retour seulement | oui, en contrepoint | oui, souvent | oui pour les portraits | par chapitre |
| Filtre de magazine par défaut | F14 ou F12 | aucun sur le magazine, effets par chapitre | F24 ou F15 | F11 ou F02 | F12 |
| Papier seul (C-035) | si C-005 | non | si C-005 | si C-005 | oui si hétérogène |

Ces cases sont des hypothèses de travail. Seul le profil V a été rejoué (Joëlle). Les autres se calibrent sur les albums du Bureau ; tant que non, la machine propose, ne pose pas.

## L. Ce que la machine ne sait pas juger

- **La bonne surface à prélever** : le mur rose plutôt que la robe jaune. Les règles disent si un aplat est juste, pas lequel des justes est le plus beau : elle en propose deux, il choisit, elle apprend.
- **Si le multicolore est le sujet ou le bruit** (rubans, déguisements). Même mesure, verdicts opposés.
- **L'imprimé réel** : le profil de Cloudprinter, la finition (mat, brillant), la limite d'encre, la transparence d'un grand aplat sombre sur couché 130 g (le dos de la page se verra-t-il ?). Tout seuil d'impression ci-dessus est un proxy FOGRA39. Une page d'épreuve physique (tous les aplats, noirs, un N&B, un ciel) suffit à le calibrer.
- **La température affective** : une photo bleue peut être le souvenir le plus chaud du voyage.
- **L'effet de voisinage réel** sous une lampe chaude (Albers) : on mesure des couleurs isolées.
- **Le goût** (une couleur étrangère voulue, la double pop joyeuse ou vulgaire) : C-011 et la fiche de projet servent à le demander.

## M. L'ordre des vérifications d'une double

Quand une double ne rend pas, la machine passe dans cet ordre et affiche la première qui échoue : **C-051** (on ne lit pas) · **C-039** (ça crie) · **C-047** (l'aplat vole la vedette) · **C-040** (presque la même couleur) · **C-044** (papeterie) · **C-041** (sale ou glacé) ·
**C-043** (ça se dispute) · **C-042** (deux jours différents) · **C-058** (la photo se dissout) · **C-027** (arc-en-ciel) · **C-025** (pas de ligne) · **C-045** (ne s'imprimera pas comme à l'écran) · **C-052** (un trou noir).
