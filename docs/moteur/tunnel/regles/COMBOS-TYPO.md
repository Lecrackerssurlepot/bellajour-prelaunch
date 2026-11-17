# Les combos de polices : la règle de construction et 40 combos nommés

Cahier du typographe, tunnel du 17/11/2026. Complète `cycle-0-2026-11-10/regles/typographie.md` (R-T-01 à R-T-35, T-01 à T-17) : **les règles ci-dessous sont
R-T-40 à R-T-60** (les numéros R-T-36 à R-T-39 restent libres). Les familles sont celles de `BANQUE-POLICES.md` (B-xx) ; ■ = déjà au catalogue, □ = à télécharger après validation.
Tout seuil est un **réglage de départ**. Rien n'est téléchargé.

## 0. Une contradiction à trancher avant tout

La maison a décidé le 09/11 **deux familles au plus par magazine** (R-T-01, R-T-08 : « le script n'est jamais une troisième famille »). Mathias demande des combos
« de deux ou trois (titre, texte, accent) ». Je ne tranche pas à sa place. Ce que je fais :
- **chaque combo est écrit en deux familles d'abord**, l'accent étant alors un *style* d'une des deux (italique, capitales espacées, une graisse) ;
- les combos à **trois familles sont marqués ⚑** et donnent aussi leur repli à deux familles ; ils ne servent que si Mathias lève la contrainte (une phrase de sa part) ;
- sur les 40 combos, **4 sont ⚑** (C-03, C-07, C-22, C-35). Le moteur actuel ne les porte pas de toute façon : `Paire` (style.ts) n'a que `titre` et `texte`, les trois niveaux sont titre / texte / légende ; une troisième
  famille demande un niveau « accent » (voir CHOIX-AUTO §6).

## 1. La règle de construction d'un combo

Un combo = trois **rôles**, pas trois polices : **titre** (grand, ≤ 4 mots, le lieu, le moment), **texte** (la lecture : histoire, légendes, repères), **accent** (une voix de plus : un mot tendre,
une heure, une annotation). Les quatre raisons d'accord de R-111 / §3 de typographie.md restent, rendues ici mesurables.

**R-T-40 Une police entre en banque, puis au catalogue, avec ses preuves.**
QUAND : avant toute entrée. QUOI : licence OFL ou Apache relue sur la fiche Google Fonts et copiée dans la fiche de la police ; test des accents de BANQUE-POLICES §0 vide pour les caractères indispensables ;
TrueType statique disponible pour chaque graisse employée ; styles nommés (R-T-07). POURQUOI : une licence fausse ou une lettre absente se paye à l'impression. MESURE : fiche de la police complète ; cmap testée.
EXCEPTION : aucune. Une police sans preuve n'est pas proposée.

**R-T-41 Le contraste de structure : deux classes opposées, ou une seule famille en deux graisses.**
QUAND : choix d'un combo. QUOI : titre et texte de classes différentes (didone / grotesque, lapidaire / humaniste, condensée / serif, manuscrite / serif de lecture, mincho / gothique), ou la même famille
(Archivo, Nunito, Plex). Jamais deux de la même classe voisine (deux serifs, deux grotesques). POURQUOI : deux polices presque pareilles se lisent comme une erreur (R-111). MESURE : étiquette de classe de chaque
police (colonne « Classe » de la banque, posée à la main) ; classes égales = refus. EXCEPTION : titre et texte de la même classe si l'un est condensé (Oswald) et l'autre normal, ou si une est display et l'autre de texte
(Playfair 900 + Playfair 400 reste une famille, donc admis).

**R-T-42 La hauteur d'x : écart sous 10 % quand les deux se touchent.**
QUAND : une date sous un titre, un accent contre des capitales, un repère à côté d'un titre. QUOI : hauteur d'x ÷ corps lue dans les deux fichiers ; si l'écart dépasse 10 %, on corrige par le corps de
l'accent ou du texte (jamais en changeant de police par bloc) : texte 9,5 pt pour une grande hauteur d'x (Poppins, Work Sans, Figtree, Rubik, Prompt), 10 pt pour une moyenne, 10,5 pt pour une petite
(Alegreya, Crimson Pro, Spectral, EB Garamond). POURQUOI : une petite x à côté d'une grande se lit comme une faute de corps. MESURE : `OS/2.sxHeight ÷ unitsPerEm` des deux fichiers (à relever au téléchargement ; je ne l'invente pas).
EXCEPTION : le titre et le texte ne se touchent jamais (un aplat entre eux) : la règle ne s'applique pas.

**R-T-43 La graisse : deux crans d'écart au moins, ou le double en taille.**
QUOI : titre et texte diffèrent par deux choses (R-118) ; un titre fin (didone, lapidaire, mincho 400) demande un grand corps, un titre gras peut rester moyen ; le texte n'est jamais plus gras que 500 (600 pour un
texte blanc sur nuit). MESURE : graisse ≥ texte + 300, ou corps ≥ ×2,5. EXCEPTION : une superfamille (Archivo, Nunito) : le contraste vient de la graisse seule.

**R-T-44 Une seule police « de caractère » par magazine.**
QUAND : un thème pays, une époque, une ambiance forte. QUOI : une seule police porte le thème (japonaise, script, display, slab, deco). Elle est le titre ou l'accent, **jamais le texte**. L'autre est une police neutre
de lecture de la liste du §7 de la banque. POURQUOI : le thème s'évoque une fois ; deux polices de caractère se battent, et le magazine devient un menu de restaurant. MESURE : combo avec plus d'une police dont le rôle
est T seul (colonne « Rôle » sans X) = refus. EXCEPTION : une police de caractère qui est aussi de lecture (Shippori Mincho X, Amiri X, Zen Kaku Gothic New X, Cairo X, Poppins X, Quicksand X) peut tenir toute la voix du magazine.

**R-T-45 Le texte courant est toujours une police de lecture.**
QUOI : corps 9,5 à 10 pt, interlignage 120 % (imposé), fer à gauche, colonne de 3 modules (R-T-13), graisse 400 ; polices de la section « texte » de la banque ou marquées X. Jamais display, script, manuscrite, slab
de titre, capitales seules. MESURE : police du niveau texte ∈ polices X. EXCEPTION : un bloc de **trois lignes au plus** (une citation) peut passer en police d'accent.

**R-T-46 L'accent : huit mots, un par double, jamais la légende.**
QUOI : l'accent est une voix de plus pour ce qui est dit (mot tendre, blague, annotation, heure) ; ≤ 8 mots, ≤ 1 bloc par double, jamais en légende ni en texte courant, jamais en capitales si c'est un script,
couleur du texte du magazine. POURQUOI : R-T-08, appliqué à tout accent. MESURE : mots ≤ 8 ; blocs d'accent par double ≤ 1 ; légendes en accent = 0. EXCEPTION : une heure ou un repère en Plex Mono / Space Mono
peut revenir sous chaque photo d'une série (c'est une donnée, pas une voix).

**R-T-47 Deux familles par défaut, trois seulement par dérogation écrite.**
QUOI : l'accent est d'abord un style de l'une des deux familles ; la troisième famille (⚑) n'existe que si Mathias a levé la contrainte du 09/11, et alors elle n'a que le rôle d'accent, au plus 8 mots par double.
MESURE : familles distinctes dans l'IDML ≤ 2 (≤ 3 sous dérogation) ; styles par famille ≤ 4. EXCEPTION : aucune.

**R-T-48 Évoquer par le dessin, jamais par la caricature.**
QUOI : pour un pays, on prend une police dessinée **dans** ce pays (Shippori Mincho, Amiri, Poppins, Kanit) ou une police de construction voisine (géométrique pour le Japon, lapidaire pour la Méditerranée) ; jamais la liste
du §8 de la banque (chop suey, Arabian nights, Rye, Sancreek, faux grec, aborigène). POURQUOI : le client, ou ceux de sa famille, connaissent le pays. MESURE : famille ∉ liste de caricatures ; test « enlevé le titre,
le magazine dit-il encore le pays ? ». EXCEPTION : aucune sur les pays ; une époque (rétro, déco) peut être assumée plus fort, parce qu'elle ne désigne personne.

**R-T-49 Les caractères du texte réel.**
QUAND : à la composition et à chaque modification d'un texte. QUOI : la machine lit les caractères réellement présents (titre, histoire, noms de lieux Geoapify, légendes) et refuse un combo dont une police ne
les a pas ; un seul caractère manquant écarte le combo, avec le nom du caractère. Particulièrement : ã ñ í ó ú (Portugal, Espagne), ø å æ (Nordiques), ő (Hongrie), ł ń ż (Pologne), č š ž, œ. MESURE : cmap contre l'ensemble des
caractères ; manquants = 0. EXCEPTION : un caractère manquant dans le **seul** titre peut tomber dans la police de texte (visible) si Mathias l'accepte ; jamais en silence.

**R-T-50 Ce que fait l'interlignage figé à 120 % aux combos.**
QUAND : le combo est choisi. QUOI : l'export vers Affinity relit toujours 120 % (D28, style.ts `INTERLIGNE_STYLE`). Conséquences par type de police : **tient** pour les polices de texte à hauteur d'x moyenne (Source Serif 4,
Lora, Newsreader, Hanken, Literata, Vollkorn, Karla) ; **limite** pour les grandes x (Poppins, Work Sans, Figtree, Rubik, Prompt, Kanit) : les lignes paraissent serrées, texte à 9,5 pt et colonne ≤ 3 modules ; **large**
pour les petites x (Alegreya, Crimson Pro, Spectral) : les lignes paraissent lâches, texte à 10,5 pt. **Capitales ou titres empilés** (Oswald, Bebas, Anton, Staatliches) : à 120 % elles laissent des trous, donc
**un titre de capitales sur une seule ligne, ou une ligne = un bloc** (R-T-12). Les titres serrés des pros (80 à 100 %) sont donc interdits ; le titre est court. MESURE : interlignage lu = 120 % ; titres de capitales
sur plusieurs lignes dans un bloc = 0.

**R-T-51 La nuit se lit plus gras et plus large.**
QUAND : part de nuit des photos élevée (voir CHOIX-AUTO), fond noir ou nuit du nuancier. QUOI : texte blanc sur fond sombre : graisse de texte 500 au lieu de 400 (le blanc « mange » le trait), approche +2 %, jamais
de police à déliés fins (Poiret One, Bodoni Moda fine, Italiana, Great Vibes) pour un petit texte ; titre fin interdit sauf grand corps. POURQUOI : un trait fin blanc sur noir vibre à l'impression. MESURE : graisse du niveau texte ≥ 500 si
fond du bloc de luminance < 25 %. EXCEPTION : un titre à plus de 60 pt peut rester fin.

**R-T-52 Les capitales ne se posent que sur une police qui les tient, et la longueur décide.**
QUOI : capitales pour le titre si le titre fait 14 signes ou moins et que la police a de vraies capitales lisibles (Oswald, Bebas, Anton, Marcellus, Cinzel, Forum, Staatliches) ; les polices « MAJ » (Cinzel, Forum,
Bebas, Staatliches, Amatic SC) ne se composent qu'en capitales et il faut vérifier É È À Ç Œ ; capitales espacées +8 % pour les repères de la famille de texte (R-T-14). Jamais de capitales en script. MESURE : signes ≤ 14 ;
approche des capitales de repère entre +50 et +120 millièmes d'em.

**R-T-53 La chaleur et la saison choisissent entre deux combos voisins.**
QUAND : il reste deux ou trois combos d'un même thème. QUOI : photos chaudes, dorées, rétro (été, soir) → serif douce, slab, script rond (Fraunces, Zilla Slab, Pacifico, Shrikhand) ; photos froides, bleues, urbaines, de
nuit, hiver → grotesque ou didone nette (Syne, Zen Kaku Gothic New, Bodoni Moda) ; photos pastel de printemps ou d'automne doux → serif légère ou rond (Young Serif, Quicksand, Mali) ;
N&B pour un tiers ou plus → didone ou grotesque, jamais arrondie ni script (R-T-03). MESURE : b* moyen de la palette, part de N&B, saison EXIF (hémisphère du lieu compris).

**R-T-54 Le profil règle la densité de voix, pas le thème.**
QUOI : *long voyage en famille* → titres de chapitres lisibles, légendes complètes, texte posé, une voix d'accent seulement pour un mot ou deux ; *vacances festives entre jeunes* → titres plus gros, rapport 2 (R-T-11),
accent en feutre ou en script autorisé, texte très court, fond noir et nuit possibles ; *couple* → titres plus calmes, rapport 1,333 ou 1,618, un script mesuré ; *événement d'un jour* → peu de pages, un titre unique,
lapidaire ou didone, jamais de blague ; *année de vie* → repères (mois, lieux) en capitales espacées partout, un accent pour les phrases, texte en colonne régulière. MESURE : rapport de l'échelle, blocs d'accent par double.

**R-T-55 Tailles de départ.**
QUOI (R-T-11 reprise) : texte 9,5 pt (9,56 pt dans le calcul du cycle 0), légende 7,5 à 8 pt, titre = texte × rapport² ; rapport 1,333 (calme : mariage, famille, galerie) → titre 17 pt, grand titre 30 pt ;
1,618 (éditorial, voyage, tendre) → titre 25 pt, grand 65 pt ; 2 (pop, sport, bande, fête) → titre 38 pt, grand 76 pt. Le mot géant est hors échelle (R-T-15). Dans l'éditeur, le corps est un multiple des corps de
référence 16 / 10 / 7 (style.ts) : titre 25 pt = ×1,56 du titre de référence. Ajustements : x petite → texte 10,5 ; x grande → 9,5. MESURE : tailles distinctes ≤ 4 hors mot géant.

**R-T-56 Un combo pèse peu.**
QUOI : au plus **4 fichiers de police** par magazine (familles × graisses × italique). Une police japonaise ou arabe : sous-ensemble `latin` seulement, sauf mot saisi par le client dans l'autre écriture. POURQUOI : le PDF embarque
chaque fichier et l'écran le charge ; le catalogue ne doit rien coûter aux pages qui ne s'en servent pas (`preload: false`). MESURE : nombre de fichiers dans le PDF ; poids du PDF.

**R-T-57 La machine propose toujours trois combos, jamais un seul.** Voir CHOIX-AUTO §3 : trois combos montrés avec les doubles de Mathias, jamais d'office un seul, jamais de menu de polices par bloc (R-T-09).

**R-T-58 Un combo se change d'un coup, sur tout le magazine** (décision du 09/11, R-T-01) : couverture, 4e, chapitres, légendes, folios. Une police ajoutée par bloc n'existe pas.

**R-T-59 Une paire n'est « validée » qu'imprimée** (R-T-24) : tant que Mathias n'a pas imprimé une double test, tous les combos ci-dessous sont **proposés**, pas garantis. Les hauteurs d'x, les chasses, les italiques réels
et le gris du texte sont à relever sur les fichiers.

**R-T-60 L'export garde ce qu'il sait garder** : police nommée, graisse nommée, corps, capitales. Les axes variables (Fraunces, Playfair optique), l'approche et les petites capitales ne sont pas prouvés dans Affinity (§8
de typographie.md) : les combos n'en dépendent pas, sauf ceux notés « à essayer ».

## 2. Les 40 combos

Conventions : **T** titre · **X** texte · **A** accent · profil : **V** long voyage en famille, **F** vacances festives entre jeunes, **C** couple, **E** événement d'un jour, **A** année de vie.
Tailles = valeurs à la page en points (R-T-55), interlignage **120 % pour tout** (imposé, R-T-50) ; « un bloc par ligne » = les titres de capitales sur plusieurs lignes. « Caps » = capitales (titre) ; « repères » = capitales espacées +8 %
de la famille de texte. ■ □ = catalogue / à télécharger. ⚑ = trois familles (dérogation).

### Australie et grands espaces

**C-01 « Piste »** — V, A. *Road trip, parcs nationaux, routes à perte de vue.*
T Oswald 600, caps (□ B-47) · X Source Serif 4 400 (■) · A Source Serif 4 italique. Titre 25 pt, texte 9,5, légende 7,5 (repères caps). Rapport 1,618.
Raison : condensée (verticale, dessin de signalisation) contre serif de lecture : classes opposées (R-T-41). Oswald a de grandes capitales qui tiennent sur un ciel : titre court posé dans le bleu. Ne va pas : mariage, enfance, un
titre de plus de 14 signes en capitales (il fait trop large), le titre sur un bleu clair (contraste à mesurer, R-T-31). Interligne : titre sur une ligne ; texte tient.

**C-02 « Côte sauvage »** — V, C. *Falaises, plages, bush côtier.*
T Fjalla One, caps (□ B-49) · X Lora 400 (■) · A Lora italique. Titre 25 pt, texte 10, légende 7,5. Rapport 1,618.
Raison : condensée à grandes capitales contre serif calligraphique ; une voix de mer sèche, la plume pour les mots tendres. Ne va pas : fête, nuit, pop. Pour la mer turquoise très saturée, préférer C-04.

**C-03 « Camp du soir »** ⚑ — V, A. *Carnet de bivouac, 4×4, feu de camp, une famille qui écrit.*
T Zilla Slab 600 (□ B-54) · X Karla 400 (□ B-86) · A Caveat 700 (■ B-63) : note de carnet, ≤ 8 mots. Titre 25 pt, texte 9,5, légende 7,5 repères caps. Rapport 1,618.
Raison : slab chaleureuse (le panneau de parc, le journal de route) contre grotesque légère, et l'écriture à la main pour ce qu'on se dit. Repli à deux familles : accent = Karla italique, sans Caveat.
Ne va pas : mariage, chic, nuit froide. La slab rend mal en capitales empilées à 120 %.

**C-04 « Surf et sel »** — F, C. *Plages, vacances d'été, ville côtière au soleil.*
T Pacifico (□ B-23) · X Figtree 400 (□ B-87) · A Figtree caps espacées (repères). Titre 38 pt, texte 9,5, légende 7,5. Rapport 2.
Raison : script rond rétro (l'affiche de surf des années 50) + grotesque ronde et nette. Pacifico seul parle ; **quatre mots au plus** ; jamais en capitales. Ne va pas : famille sage, deuil, N&B, texte long. Variante : Sacramento à la place de Pacifico
si on veut moins gras.

**C-05 « Grand ciel »** — V, F. *Titre sur un ciel immense, affiche.*
T Bebas Neue (□ B-48) · X Spectral 400 (□ B-81) · A Spectral italique. Titre 38 pt, texte 10,5 (petite x), légende 8. Rapport 2.
Raison : capitales hautes et étroites, serif fine pour la lecture. Ne va pas : tout ce qui n'est pas en capitales ; un titre long ; un texte blanc sur fond noir (R-T-51 : Spectral 300 trop fin). À essayer : les accents des capitales (É È Ç Œ).

### Japon

Les trois combos japonais évoquent le pays par la sobriété et le vide. **Aucun n'imite des caractères** (§8 de la banque).

**C-06 « Mincho »** — C, V. *Kyoto, temples, jardins, voyage calme à deux.*
T Shippori Mincho 600 (□ B-27) · X Zen Kaku Gothic New 400 (□ B-30) · A Shippori Mincho 800. Titre 17 pt (rapport 1,333), grand titre 30 pt, texte 9,5, légende 7,5 repères caps. 
Raison : mincho (serif japonaise) contre gothique japonaise : deux classes opposées, même origine (le dessinateur japonais, le Latin accordé au kana). Un titre court, **beaucoup de blanc**. Ne va pas : fête, nuit pop, enfance, grand mot gras en capitales.
Variante plus livre : Zen Old Mincho 700 au titre. Accents : tester Œ et capitales (Shippori Latin-1 attendu).

**C-07 « Tokyo nuit »** ⚑ — F, C. *Ville la nuit, néons, ruelles, izakaya.*
T Zen Kaku Gothic New 900, caps (□ B-30) · X Newsreader 400 (■) · A IBM Plex Mono 400 (■ B-61), heures et lieux (« 23 h 41 · Shinjuku »). Titre 38 pt, texte 9,5, légende 7,5. Rapport 2. Fond nuit ; texte en 500 (R-T-51).
Raison : gothique nette et grasse pour la ville, serif de lecture pour le texte, chasse fixe pour la donnée. Repli à deux familles : accent = Zen Kaku Gothic New 500 caps espacées. Ne va pas : tendre, famille, jour clair. Un titre long
en caps gras se serre à 120 % : 14 signes au plus.

**C-08 « Carnet de Kyoto »** — C, V. *Journal à la main, haïku de voyage, petit carnet.*
T Klee One 600 (□ B-32), ≤ 6 mots · X Shippori Mincho 400 (□ B-27) · A Klee One 400. Titre 25 pt, texte 10, légende 7,5. Rapport 1,618.
Raison : écriture de manuel scolaire japonais (tracé fin, lent, juste) contre mincho : manuscrite contre serif (R-T-41), le titre est l'écriture ; **jamais en légende ni en capitales** (R-T-08). Ne va pas : sport, nuit, chic. Accents de Klee One : tester avant tout.

### Asie du Sud-Est et Inde

**C-09 « Marché de nuit »** — F, V. *Thaïlande, Vietnam, street food, scooters.*
T Kanit 700, caps (□ B-40) · X Pridi 400 (□ B-42) · A Kanit caps espacées (repères). Titre 38 pt, texte 10 (Pridi, x moyenne-petite), légende 7,5. Rapport 2.
Raison : grotesque carrée thaïlandaise (grande x, capitales franches) contre serif douce de la même région : l'accord vient de la même main. Ne va pas : mariage, chic froid. Kanit en texte : jamais (R-T-45).

**C-10 « Bali doux »** — C, V. *Rizières, plages tropicales, vacances calmes.*
T Quicksand 700 (□ B-46) · X Lora 400 (■) · A Lora italique. Titre 25 pt, texte 10, légende 7,5. Rapport 1,618.
Raison : rondeur douce, sans enfance, contre serif de plume. Ne va pas : sport, nuit. Variante tendre-enfance : Mali 600 au titre (C-32).

**C-11 « Jaipur »** — F, E. *Inde, couleurs, fêtes, mariage indien, grande couleur.*
T Rozha One (□ B-15), 3 mots · X Poppins 400 (□ B-44) · A Poppins 500 caps espacées. Titre 38 pt, texte 9,5 (grande x), légende 7,5. Rapport 2.
Raison : didone grasse d'origine indienne contre géométrique ronde du même atelier : le contraste fat face / géométrique. Ne va pas : intime, deuil, nuit froide, texte long en Poppins (limite à 120 %).

### Méditerranée

**C-12 « Forum »** — C, V, E. *Italie, Grèce, ruines, mer, lapidaire.*
T Cinzel 600, caps (□ B-12) · X Hanken Grotesk 400 (■) · A Hanken caps espacées (repères). Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : lapidaire (la pierre gravée de Rome) contre grotesque neutre. Ne va pas : fête, sport, enfance, plus de 14 signes. **Vérifier É È Ç Œ en capitales avant tout** (Cinzel est une police de capitales).

**C-13 « Azulejo »** — V, F. *Portugal, Espagne, carrelages, façades, tapas.*
T Chonburi (□ B-17), 3 mots · X Source Sans 3 400 (□ B-89) · A Source Sans 3 italique. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : serif grasse à fort contraste (enseignes de commerce) contre humaniste sobre. Ne va pas : chic fin, mariage. Accents ã á í ó à tester (Portugal).

**C-14 « Taverne »** — V, C, A. *Îles grecques, cafés, ardoise du jour.*
T Amatic SC 700 (□ B-66), caps · X Lora 400 (■) · A Lora italique. Titre 38 pt, texte 10, légende 7,5. Rapport 2.
Raison : capitales à la main très étroites (l'ardoise du café) contre serif de plume. Ne va pas : chic, nuit, tout ce qui est long. Amatic est très étroit : corps de titre **un cran au-dessus** (grande taille, 2 mots). Tester É È Ç Œ.

**C-15 « Riviera »** — C, E. *Côte d'Azur, villa, mariage au bord de l'eau, chic solaire.*
T Gloock (□ B-10) · X Instrument Sans 400 (■) · A Instrument Sans caps espacées. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : serif grasse à empattements nets (l'élégance de l'été) contre grotesque fine. Ne va pas : sport, enfance, nuit. 

### Pays nordiques

**C-16 « Fjord »** — V, C. *Norvège, Islande, randonnée, lumière froide.*
T Figtree 600 (□ B-87) · X Literata 400 (□ B-84) · A Literata italique. Titre 25 pt, texte 10, légende 7,5. Rapport 1,618.
Raison : grotesque ronde et nette contre serif de livre. Ne va pas : chic, rétro, fête. Lieux : tester **ø å æ** (Tromsø, Ålesund), car ce sont les lettres du pays.

**C-17 « Aurore »** — C, A. *Nuit nordique, ciel vert, lenteur.*
T Spectral 300 italique (□ B-81), grand corps (≥ 38 pt) · X Karla 400 (□ B-86) · A Spectral 400. Titre 38 pt, texte 9,5, légende 7,5. Rapport 2.
Raison : serif très fine, de grand corps, contre grotesque légère. Texte blanc sur nuit : Karla 500 (R-T-51), le titre en 300 seulement à plus de 60 pt. Ne va pas : petit titre, enfance, photo agitée.

**C-18 « Cabane »** — V, A, E. *Maison de vacances, famille, hiver chaud, hygge.*
T Young Serif (□ B-11) · X Figtree 400 (□ B-87) (pas DM Sans : c'est la police d'interface du site, B-88) · A Figtree caps espacées. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : serif ronde et chaude contre grotesque ronde : l'accord est dans la rondeur commune, le contraste dans l'empattement. Ne va pas : chic, sport, nuit. À essayer : jamais de capitales en Young Serif.

### Amérique latine

**C-19 « Fiesta »** — F. *Carnaval, plage, musique, couleurs vives.*
T Shrikhand (□ B-16), ≤ 3 mots · X Figtree 400 (□ B-87) · A Figtree caps espacées. Titre 38 pt, texte 9,5, légende 7,5. Rapport 2.
Raison : fat italique chaude et joyeuse contre grotesque ronde. Ne va pas : intime, deuil, N&B, plus de trois mots ; jamais en légende.

**C-20 « Cartel peint »** — F, V. *Enseignes peintes de Cuba, du Mexique, du Pérou ; affiches de rue.*
T Alfa Slab One, caps (□ B-22) · X Libre Baskerville 400 (□ B-82) · A Libre Baskerville italique. Titre 38 pt, texte 9,5 (x grande, Baskerville large), légende 7,5. Rapport 2.
Raison : slab lourde d'enseigne peinte contre serif de transition. Ne va pas : chic fin, mariage, texte à petit corps. Pas de police « sombrero » (§8 de la banque).

**C-21 « Calle »** — F, A. *Ville latine, graffitis, street art, bande.*
T Rubik 800, caps (□ B-53) · X Source Serif 4 400 (■) · A Rubik 400 caps espacées (repères). Titre 38 pt, texte 9,5, légende 7,5. Rapport 2.
Raison : grotesque à coins arrondis, un peu brute, contre serif de lecture. Ne va pas : mariage, calme. Rubik a une grande x : à 120 %, texte 9,5 pt (R-T-50).

### États-Unis

**C-22 « Route 66 »** ⚑ — V, F. *Road trip américain, motels, journal de bord.*
T Big Shoulders Display 800, caps (□ B-50) · X Bitter 400 (□ B-55) · A Special Elite (□ B-24, **Apache 2.0**), tampon et notes. Titre 38 pt, texte 9,5, légende 7,5. Rapport 2.
Raison : condensée industrielle de Chicago contre slab douce et machine à écrire pour le journal de bord. Repli à deux familles : accent = Bitter italique. Ne va pas : mariage, chic, calme. Pas de police « western » (§8).

**C-23 « Campus »** — F, A. *Équipe, université, week-end sportif, bande.*
T Staatliches, caps (□ B-51) · X Karla 400 (□ B-86) · A Karla caps espacées. Titre 38 pt, texte 9,5, légende 7,5. Rapport 2.
Raison : capitales d'écusson, condensées, contre grotesque légère. Ne va pas : tendre, famille calme. Tester les accents des capitales.

**C-24 « Manhattan »** — C, A, E. *New York, éditorial, mode, galerie.*
T Playfair Display 900 (□ B-08) · X Source Sans 3 400 (□ B-89) · A Playfair italique. Titre 25 pt, texte 9,5, légende 7,5 repères caps. Rapport 1,618.
Raison : didone de presse contre humaniste neutre ; l'italique est l'accent. Ne va pas : enfance, sport, texte long en Playfair, photo très granuleuse (déliés). À essayer : le gras variable (R-T-60).

### Maghreb

**C-25 « Médina »** — V, C. *Marrakech, Fès, ruelles, riads, cuirs et épices.*
T Amiri 700 (□ B-35) · X Cairo 400 (□ B-38) · A Amiri italique. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : serif dessinée par un dessinateur arabe, accordée à une ligne calligraphique, contre grotesque nette arabe-latine : une même culture de dessin. Ne va pas : sport, pop, nuit froide. Accents à tester sur les deux.

**C-26 « Zellige »** — V, F. *Carrelages, géométrie, ville, arts décoratifs.*
T Reem Kufi 600 (□ B-37), ≤ 3 mots · X Source Serif 4 400 (■) · A Source Serif 4 italique. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : dessin géométrique d'esprit coufique, sobre en Latin, contre serif de lecture. Ne va pas : tendre, enfance, texte. Latin de Reem Kufi : **tester Œ et É** avant d'y compter.

**C-27 « Désert du soir »** — C, V. *Sahara, dunes, coucher de soleil, bivouac.*
T El Messiri 600 (□ B-36) · X Crimson Pro 400 (□ B-80) · A El Messiri caps espacées (repères). Titre 25 pt, texte 10,5 (petite x), légende 8. Rapport 1,618.
Raison : serif d'affiche chic contre serif de livre garalde : **même classe voisine**, exception admise parce que El Messiri est un display de caractère et Crimson un texte (R-T-41, exception). Si le doute persiste, X = Cairo 400.
Ne va pas : fête, enfance, sport.

### Ville

**C-28 « Métropole »** — F, A, C. *City trip, bureaux, rues, architecture.*
T Bricolage Grotesque 700 (□ B-57) · X Source Serif 4 400 (■) · A Bricolage caps espacées. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : grotesque à caractère contemporain contre serif de lecture : l'inverse du classique (sans en titre, serif en texte). Ne va pas : mariage, enfance. (Cousin de T-17 ■ Inter Tight + Newsreader : rien à télécharger.)

**C-29 « Skyline »** — F, C. *Ville la nuit, gratte-ciel, rooftop.*
T Syne 800 (□ B-56), caps · X Spectral 400 (□ B-81) · A Syne 500 caps espacées. Titre 38 pt, texte 10,5, légende 7,5. Rapport 2. Texte en 500 sur fond nuit.
Raison : grotesque large et décalée (galeries, mode) contre serif fine. Ne va pas : famille classique, mariage, texte long en Syne.

**C-30 « Gazette »** — A, C. *Journal du mois, éditorial, culture.*
T DM Serif Display (□ B-09) · X Figtree 400 (□ B-87) · A DM Serif Display italique. Titre 25 pt, texte 9,5, légende 7,5 repères caps. Rapport 1,618.
Raison : didone douce de titrage contre grotesque ronde. Ne va pas : enfance, sport, deuil. 

### Enfance

**C-31 « Premier été »** — V, A, E. *Vacances avec les petits, naissance, premier anniversaire.*
T Fredoka 600 (□ B-67) · X Lora 400 (■) · A Fredoka caps espacées. Titre 25 pt, texte 10, légende 7,5. Rapport 1,618.
Raison : rondeur sans dessin d'enfant contre serif de plume, pour que le texte garde sérieux. Ne va pas : chic, couple, nuit. (Cousin de T-12 ■ Nunito seule.)

**C-32 « Cahier d'école »** — A, V. *Journal de l'enfant, phrases dites, dessins.*
T Mali 600 (□ B-41) · X Source Serif 4 400 (■) · A Mali italique. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,618.
Raison : écriture ronde d'école (Thaïlande), lisible, contre serif de lecture. Ne va pas : chic, nuit, mariage. Mali en texte : jamais.

### Mariage

**C-33 « Allée de roses »** — E, C. *Mariage romantique, faire-part, belle lumière.*
T Great Vibes (□ B-64), ≤ 4 mots, grand corps · X Crimson Pro 400 (□ B-80) · A Crimson Pro caps espacées (date). Titre 38 pt, texte 10,5, légende 8. Rapport 1,618.
Raison : calligraphie du faire-part contre serif de livre : le script ne parle que pour le nom. **Risque de papeterie** (typographie.md §8) : un seul script par magazine, jamais en légende. Ne va pas : sport, fête, nuit.
Variante : Pinyon Script (plus penchée, plus ancienne).

**C-34 « Faire-part »** — E. *Mariage sobre, cérémonie, ville.*
T Forum, caps espacées (□ B-13) · X Source Sans 3 400 (□ B-89) · A Forum caps. Titre 25 pt, texte 9,5, légende 7,5. Rapport 1,333 à 1,618.
Raison : lapidaire fine, sans prétention, contre humaniste. Ne va pas : fête, enfance. Alternatives sans téléchargement : T-16 (Italiana + Jost), T-03.

### Nuit et fête

**C-35 « Club »** ⚑ — F. *Soirée, concert, festival, flash, couleurs.*
T Space Grotesk 700, caps (■ B-58) · X Newsreader 400 (■) · A Space Mono 400 (□ B-59), heures. Titre 38 pt, texte 9,5 (500 sur nuit), légende 7,5. Rapport 2.
Raison : grotesque à caractère contre serif de lecture ; chasse fixe pour l'heure. Repli à deux familles : accent = Space Grotesk 500 caps. Ne va pas : famille classique, tendre. (Cousin de T-14 : Plex.)

**C-36 « Grand soir »** — F, E. *Gala, soirée années folles, bal, cabaret.*
T Limelight (□ B-20), ≤ 3 mots · X Josefin Sans 400 (□ B-45) · A Josefin caps espacées. Titre 38 pt, texte 10 (petite x), légende 7,5. Rapport 2.
Raison : déco des années 1920, deux dessins qui viennent de la même époque : contraste (fat face fine / géométrique). Ne va pas : famille calme, tendre, nature. Un seul usage : la soirée à thème. Texte blanc sur nuit : Josefin 600.

### Rétro

**C-37 « Polaroid »** — A, V. *Carnet, tirages anciens, vacances d'avant.*
T Special Elite (□ B-24, **Apache 2.0**), 5 mots · X Libre Baskerville 400 (□ B-82) · A Libre Baskerville italique. Titre 17 pt, texte 9,5, légende 7,5. Rapport 1,333.
Raison : machine à écrire (dactylographie, fiche, ticket) contre serif de transition. Ne va pas : mariage, chic, enfance, titre sur photo. Tester Œ.

**C-38 « Kodachrome »** — F, V. *Photos saturées, été 1970, rétro chaleureux.*
T Abril Fatface (□ B-14) · X Karla 400 (□ B-86) · A Karla caps espacées. Titre 38 pt, texte 9,5, légende 7,5. Rapport 2.
Raison : fat face de la presse du XIXᵉ au grand cœur contre grotesque légère. Ne va pas : N&B fin, mariage, texte long en Abril. Cousin sans téléchargement : T-08 (Fraunces + Work Sans).

### Année de vie, famille, calme

**C-39 « Almanach »** — A, V. *Une année en mois, famille, maison, saisons.*
T Vollkorn 700 (□ B-85) · X Hanken Grotesk 400 (■) · A Vollkorn italique. Titre 17 à 25 pt, texte 9,5, légende 7,5 repères caps (« JUIN · KERLOUAN »). Rapport 1,333.
Raison : serif chaleureuse « de pain » contre grotesque neutre ; les repères en capitales espacées font l'année. Ne va pas : sport, chic froid, nuit.

**C-40 « Chronique »** — A, C. *Une année, un couple, notre histoire.*
T Libre Baskerville 700 (□ B-82) · X Work Sans 400 (■, x grande : 9,5) · A Libre Baskerville italique. Titre 25 pt, texte 9,5, légende 7,5 repères caps. Rapport 1,618.
Raison : serif de transition lourde contre grotesque franche : classes opposées, chaleur du livre. Ne va pas : enfance, sport, fête. Cousin sans téléchargement : T-15 (Caslon + Franklin).

## 3. Index : thème et profil → combos

| Profil | Combos (ordre de préférence) |
|---|---|
| Long voyage en famille (V) | C-01, C-03 ⚑, C-02, C-16, C-25, C-12, C-13, C-39, C-31 |
| Vacances festives entre jeunes (F) | C-04, C-19, C-21, C-35 ⚑, C-09, C-22 ⚑, C-23, C-38 |
| Couple (C) | C-06, C-08, C-10, C-24, C-17, C-27, C-33, C-40 |
| Événement d'un jour (E) | C-34, C-33, C-12, C-15, C-11, C-36 |
| Année de vie (A) | C-39, C-40, C-32, C-30, C-14 |
| Thème | Combos |
|---|---|
| Australie, grands espaces | C-01, C-02, C-03 ⚑, C-04, C-05 |
| Japon | C-06, C-07 ⚑, C-08 |
| Asie du Sud-Est, Inde | C-09, C-10, C-11 |
| Méditerranée | C-12, C-13, C-14, C-15 |
| Pays nordiques | C-16, C-17, C-18 |
| Amérique latine | C-19, C-20, C-21 |
| États-Unis | C-22 ⚑, C-23, C-24 |
| Maghreb | C-25, C-26, C-27 |
| Ville | C-28, C-29, C-30 (et T-17, T-01) |
| Enfance | C-31, C-32 (et T-12) |
| Mariage | C-33, C-34 (et T-16, T-03) |
| Nuit, fête | C-35 ⚑, C-36 (et T-14) |
| Rétro | C-37, C-38 (et T-08) |
| Année, famille, calme | C-39, C-40 (et T-15, T-13) |

⚑ (trois familles, dérogation à confirmer) : C-03, C-07, C-22, C-35. Les autres accents venus d'une famille tierce sont des *variantes* (C-04 Sacramento, C-06 Zen Old Mincho, C-33 Pinyon Script), pas des combos.

## 4. Les combos livrés par le catalogue (zéro téléchargement)

Les 18 paires de `style.ts` restent la base. Pour un thème, elles répondent sans rien télécharger : mer, lumière, Méditerranée T-03 · ville, voyage T-17, T-01, TW-2 · tendre T-02, T-11 · pop, été T-05, T-08, T-09 · bande T-10, T-07 ·
sport T-06 · enfance T-12 · nature, île T-13 · famille T-15 · chic, mariage T-16 · nuit, archive T-14 · calme TW-1. **Ce qui manque au catalogue** : le Japon, le Maghreb, l'Asie du Sud-Est, les Amériques, les grands espaces au caractère brut (Oswald et slab),
le script de mariage, la fête au caractère (Shrikhand). C'est ce que la banque ajoute.
