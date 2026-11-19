> **Copie nettoyée (M-01) de `32-AVIS.md` du socle du 19/11**, écrite par `scripts/socle-import.ts` : ne pas éditer à la main.
> Les magazines de référence y sont nommés par leur profil (« réf. couple », « réf. famille »). Les règles vivent en données
> (`src/lib/mise-en-page/regles/socle/`) ; les réponses de Mathias du 19/11 sont dans `A-TRANCHER.md` (M-35 à M-57).

# 32 · L'avis de l'équipe, avant de lancer quoi que ce soit (19/11/2026)

## Ce que vaut ce socle

**Ce qui est solide.**
- **Le cadre.** Sept moteurs qui ne reviennent jamais en arrière, une échelle de priorité P0 à P7, un repli par règle, quatre arrêts. Il
  tient à l'épreuve du croisement : sur 48 conflits trouvés, l'échelle en règle 24 seule ; 4 autres sont tranchés par ses propres mots.
- **Les corrections de son dernier échec.** Ses quatre reproches d'histoire ont chacun leurs règles, et leurs causes sont prouvées sur
  son magazine en couple : GPS lu puis jamais transmis, enseignes prises pour des lieux, chapitres de l'IA qui coupent les journées,
  ouverture prise trois jours plus tard, fin choisie en premier. Ce sont des erreurs de câblage, pas de goût : elles se corrigent.
- **Ses interdits.** Personne coupée, personne en petit, page presque vide, aucune reconnaissance de visage, textes qui sont des faits :
  ils sont en P0, et plusieurs sont déjà codés.
- **Le rejeu sans repayer.** Les lectures de l'IA sont gardées ; tout le reste se rejoue en moins d'une seconde (prouvé sur le code actuel).

**Ce qui est hypothèse : presque tout.** 1041 règles sur 1 234 (84 %) ne s'appuient sur aucune parole de lui. Presque tous les chiffres
sont des réglages de départ. Aucune règle n'a encore tourné.

**Ce qui manque.**
- un **album de fête** (zéro) et un deuxième **événement** : leurs réglages ne reposent sur rien ;
- un **lot non trié avec des rafales** : une quarantaine de règles de doublons et de séries n'ont jamais vu un vrai cas ;
- le **seuil de l'imprimeur** : définition, largeur du pli, couleur. Toute la fabrication tourne sur du provisoire ;
- la **fiabilité des tags de l'IA**, jamais mesurée contre ses corrections : on n'a que des accords entre mesures (plan 55 %, moment 84 %) ;
- « **nos personnes** » séparées des passants : la règle est écrite, l'information n'existe pas encore ;
- **13 formes** de double qu'il fait et que le catalogue ne sait pas faire (les quatre premières sont les siennes).

## À quel résultat s'attendre

Les chiffres ci-dessous sont des **estimations**, pas des promesses. Ils viennent de l'enquête sur son magazine en couple et des seuils
proposés dans `13-ENTRAINEMENT.md`.

**Le premier magazine sorti avec ce socle, comparé à celui qu'il n'a pas aimé, fera mieux sur l'histoire :**
- les photos d'une même journée au même lieu restent ensemble (lui en réunit 16 paires sur 27, la machine 11) ;
- les titres sont des villes, des sites ou des dates ; zéro enseigne, zéro thème inventé (la machine en avait mis 6) ;
- les plats se rassemblent sur une page ; la fin est un au revoir, pas un selfie ;
- moins de retours en arrière non voulus (lui 5, tous voulus ; la machine 14) ; plus de double à une seule photo (la machine en avait 4).

**Il fera encore mal :**
- les **formes** : tant que ses quatre doubles favorites manquent au catalogue, la machine s'en approche sans les refaire ;
- le **goût** : quel héros, quelle couverture, quel recadrage. Les règles donnent un bon défaut, pas son œil ;
- les **cas rares** : un lot sans GPS, une fête, un lot plein de rafales, deux téléphones décalés.

**La mesure.** Jamais un seul chiffre. Douze mesures d'accord avec ses magazines (mêmes photos gardées, mêmes photos ensemble, même
journée, même ordre, même nombre par double, mêmes titres, même fin, mêmes grandes photos, couverture, recadrage, fautes dures), plus deux
chiffres de production : **la part des doubles gardées sans retouche** et **le temps passé**.

| palier | ce qu'on vise | quand (estimation) |
|---|---|---|
| **1 · Juste** | zéro faute dure, zéro enseigne ni thème en titre, zéro retour en arrière non voulu, les journées réunies au niveau des siennes | 1 à 2 tours de réglage sur ses deux magazines, une fois les vagues 1 et 2 codées |
| **2 · Proche** | la moitié de ses paires « même double » retrouvées, un écart d'au plus une photo par double ; environ la moitié des doubles gardées sans retouche | 3 à 5 tours, et les quatre premières formes manquantes ajoutées |
| **3 · « Je garde la plupart »** | 70 à 80 % des doubles gardées sans retouche, sur 10 magazines de suite, tous profils présents (sa cible : « 50 % du premier coup, 40 % quelques retouches, 10 % qui passent du temps ») | pas avant un jeu de 10 magazines de référence ; le nombre de tours est inconnu, on le dira à la mesure |

## Les risques et la parade

| risque | parade |
|---|---|
| **Trop de règles jamais éprouvées** : 1 234 règles, aucune n'a tourné | les coder par vagues ; une règle neuve tourne d'abord « en ombre » (elle propose sans décider) ; le test « qui fait céder qui » sur ses magazines désigne les mauvaises |
| **Sur-régler sur deux magazines** | une règle reste générale (M-01) ; on ajoute des magazines au jeu (ses albums rangés par profil) ; un chiffre qui baisse sur un magazine bloque le réglage |
| **L'IA varie d'une lecture à l'autre** | les lectures sont gardées et rejouées ; aucune décision P0 à P2 ne repose sur un seul tag d'IA ; deux lectures sur les champs à enjeu |
| **Le coût** | mesuré : 0,20 $ pour 40 photos, 0,38 $ pour 164 ; plafond 1 € par projet ; le rejeu est gratuit ; toute relecture demande son oui |
| **Trois cercles relevés au croisement** | la réserve « pas de place » (question n° 9), le texte qui arrive après la mise en page (couper l'Habillage en deux), les personnes comptées trois fois (la Lecture seule compte) |

## Ce qu'on recommande de construire d'abord, dans l'ordre

1. **Le banc de réglages, réduit** : rejouer ses deux magazines, calculer les douze mesures, et **reproduire les chiffres de l'enquête**
   (16 et 11 journées, 5 et 14 retours). Tant que le banc ne refait pas ces chiffres, il ne juge rien.
2. **Vague 1 · les interdits et les informations qui manquent** : le GPS géocodé transmis, la sorte de chaque nom lu (lieu ou enseigne),
   « nos personnes », le visage confirmé ; les P0 à P2.
3. **Vague 2 · le récit** : journées-lieux qu'on ne coupe pas, ouverture dans le premier jour, sujets rassemblés, fin, profil lu sur « qui ».
4. **Vague 3 · les titres** : l'annonce des textes avant la mise en page ; des faits ou rien.
5. **Vague 4 · les quatre formes** qui lui manquent le plus.
6. Le reste ensuite, par vagues, toujours en ombre d'abord.

**À ne pas faire maintenant** : coder les 1 234 règles d'un coup ; régler couleurs, polices et filtres (196 règles de style) avant que
l'histoire tienne ; ouvrir l'éditeur aux clients ; payer des lectures IA en double partout ; écrire de nouvelles règles avant que le banc
existe.

## Ce qu'on attend de lui

1. **Les 15 réponses**, un mot chacune (`31-A-TRANCHER.md`). Sans réponse, la machine prend nos recommandations.
2. **Des magazines finis avec leur lot complet** : au moins une fête, un événement, et un lot non trié avec des rafales.
3. **Corriger les tags** de ses deux magazines dans la page Analyse : c'est ce qui mesure enfin la fiabilité de l'IA.
4. **Demander à l'imprimeur un exemplaire témoin** : pli, seuil de définition, couleur.
5. **Une demi-heure par semaine au banc** au début, et le bouton « Ça ne va pas » avec sa raison.
