# Les profils de projet (17/11/2026)

Hors git. Un profil = une façon de raconter. La machine est la même, les règles changent. Tout seuil chiffré est un **réglage de départ** (RD), jamais un fait.
Règle d'or : **les données du dossier priment sur l'occasion déclarée** (« Un été indien » pour un Noël à Madrid ; « Un festival » pour des photos de jour en parc). La fiche saisie par Mathias (cinq champs) prime sur les deux.

## Comment la machine reconnaît un profil (signaux calculés sur le lot)

| signal | d'où il vient | état |
|---|---|---|
| durée (premier au dernier jour daté) et nombre de jours photographiés | date de prise | existe |
| photos par jour photographié (régularité) | date de prise | existe |
| nombre de visages comptés par photo, part des photos avec 0 / 1-2 / 3+ visages (D29 : on compte, on ne reconnaît jamais) | détecteur de visages | existe, **sous-compte les petits visages** (voir la mise en garde) |
| part de nuit : heure de prise 20 h à 6 h, ou luminance moyenne basse | date + luminance | existe |
| part de paysages / lieux / détails (sans visage) | tags B (sujet) | existe après « Lire les photos » |
| nombre de villes et de pays, distance totale | GPS + lieux | existe quand il y a un GPS (Joëlle : aucun) |
| part de photos verticales, ratios extrêmes (panoramique, écran) | dimensions | existe, pas encore utilisé comme signal |
| provenance : appareil, reçue par messagerie, capture, œuvre photographiée, photographe | EXIF absent, filigrane, taille | **manque** |
| moment de la journée, ambiance (fête, repas, plage…), plan (large, moyen, serré) | IA couche 5 | **à ajouter** (plan du 17/11) |
| taille commandée (pages) | commande | existe |

Mise en garde : sur le banc du cycle 1, le détecteur donne 11 % de photos à visage pour Candice et 14 % pour Jeanne (un rallye entre amis !). Il rate les petits visages et les visages de profil. Un signal « visages » faible n'est donc jamais une preuve d'absence de gens : il se recoupe avec le tag IA « personnes ».

## Les six profils

### P1. Long voyage (famille ou amis), 10 jours ou plus
- **On le reconnaît** : au moins 10 jours, 5 jours photographiés ou plus, 2 pays ou 5 lieux (quand il y a un GPS), moins d'un tiers de photos avec visage (RD), très peu de nuit (moins de 10 %), majorité de paysages, lieux, détails ; quelques groupes posés (3 visages ou plus) aux étapes.
- **Structure type** : ouverture par un lieu fort ou les gens ; un chapitre par étape (lieu, sinon quelques jours) ; un sommet vers 60 à 70 % ; deux respirations ; une dernière page « nous ».
- **Densité** : alternance voulue (parole de Mathias pour Joëlle) : de grandes photos mises en valeur, et des pages « belle composition dense ». RD : 2,5 à 3,2 photos par double ; 25 à 35 % de pleines pages ou de doubles seules ; 20 à 30 % de doubles denses (6 à 10).
- **Stylisation** : moyenne. Titres de lieux, aplats pris dans les photos (ciel, sable, objet coloré), une à deux « signatures ».
- **Fonds** : blanc par défaut, un aplat de teinte sourde sur les ouvertures ; noir jamais, sauf une double de nuit.
- **Ton des titres** : lieu en grand, sobre, sans blague. Le mot du client en ouverture.
- **Il interdit** : le mur de petites photos sur toute une étape ; les panoramiques coupés en portrait ; plus de deux grilles égales de suite ; une date sur chaque page.

### P2. Vacances festives entre jeunes (nuit, fête, énergie)
- **On le reconnaît** : durée courte à moyenne (3 à 14 jours), part de nuit 25 % ou plus (heure de prise ou luminance basse, RD), 3 visages ou plus sur au moins 40 % des photos (RD), flash, selfies, beaucoup de rafales, lots dans la même soirée.
- **Structure type** : une journée / une nuit par chapitre ; l'alternance jour clair et nuit noire fait le rythme ; un sommet = la meilleure soirée ; une fin par le groupe entier.
- **Densité** : serrée. RD : 3 à 5 photos par double ; 10 à 15 % de pleines pages (une photo « énorme » par soirée) ; planches-contact et bandes de photomaton permises (jusqu'à 12).
- **Stylisation** : forte. Effets de couleur, noir et blanc par double, grain, texte en très grand.
- **Fonds** : noir pour la nuit (jamais du noir pur imprimé : noir teinté, voir la limite d'encre), blanc ou une couleur franche pour le jour ; la couleur d'accent reprend la lumière dominante (néon, rouge).
- **Ton des titres** : court, brut, drôle (« Jour 3 »). Mots du client en grand. Pas de légendes.
- **Il interdit** : les paysages calmes en pleine page sans gens ; le fond blanc sur une double de nuit ; un visage coupé ; le sérieux.
- **Preuve du corpus** : AUCUN album du corpus ne l'illustre pleinement. Eloise « La vie, les copains » en porte des morceaux (30 % de photos prises entre 20 h et 5 h, 48 % à 3 visages ou plus). Les règles de ce profil sont des hypothèses nourries par les pros (noir et blanc sur environ une double sur trois, cycle 0) et par les rapports de Mathias. **À essayer sur un vrai lot de soirées.**

### P3. Couple
- **On le reconnaît** : exactement deux visages dans les photos à gens (jamais de 3 visages et plus au-delà de 10 %, RD) ; beaucoup de selfies ; souvent un long intervalle (Lara : 1 087 jours, Marjorie : 3 042 jours) ou un voyage à deux (Merisa : 10 jours).
- **Structure type** : voyage → chronologique ; années → un chapitre par saison ou par lieu ; la fin = « nous deux », la première page = un duo.
- **Densité** : ample. RD : 2 à 3 photos par double ; 40 à 55 % de pleines pages (Lara : 22 sur 38 pages ; Merisa : 21 sur 44) ; une photo = un souvenir.
- **Stylisation** : moyenne à forte sur les portraits (noir et blanc, aplat rouge), faible sur le reste.
- **Fonds** : blanc cassé, un aplat chaud ; noir pour le soir.
- **Ton des titres** : tendre, mots vrais (« 9 ans d'amour »). Pas de lieux en grand si le couple est le sujet.
- **Il interdit** : le selfie rapproché déformé en grand ; deux fois la même scène ; un paysage seul en dernière page ; le sticker visible en grand.

### P4. Événement d'un jour ou d'un week-end
- **On le reconnaît** : durée de 1 à 3 jours, 80 photos ou plus dans un temps court, fort étalement des heures sur la journée (lever au coucher, parfois la nuit), beaucoup de rafales, des gestes et de l'action, souvent des photos d'un tiers (photographe) : filigrane, 5 200 px de large, sans date lisible.
- **Structure type** : le déroulé du jour en heures (matin, midi, soir) ; un sommet = l'instant fort (arrivée, podium, mariage, coup d'envoi) ; la fin = le groupe réuni.
- **Densité** : variable, rythmée. RD : 3 à 4 photos par double ; une pleine page par temps fort ; une ou deux séries (pellicule, journée en vrac).
- **Stylisation** : moyenne ; l'heure comme texte est la signature naturelle de ce profil (voir « l'heure comme texte » de Mathias).
- **Fonds** : blanc ou la couleur de l'événement (l'orange d'une voiture de rallye : un objet de couleur qui revient).
- **Ton des titres** : horloge, chiffre (« 24 h »), lieu, jamais de date de calendrier en grand.
- **Il interdit** : le plan large sans personne face à un gros plan de gens ; un filigrane de photographe recadré (droits) ; l'heure erronée (fuseaux de téléphones différents).

### P5. Année de vie (album sur plusieurs mois)
- **On le reconnaît** : plus de 90 jours, moins de 30 jours photographiés, beaucoup d'occasions différentes, plusieurs lieux sans trajet, mélange de gens, de paysages, de sorties, captures d'écran, doublons ; 15 à 40 % de photos sans date (Eloise : 7 sur 63).
- **Structure type** : un chapitre par mois (ou par saison si moins de 10 photos par mois) ; le mois en grand ; pas de sommet voulu : le meilleur mois prend la place ; une fin « tous ensemble ».
- **Densité** : moyenne. RD : 2 à 3 photos par double ; 35 à 50 % de pleines pages ; plusieurs doubles à 1 photo sont permises seulement avec un mot du client.
- **Stylisation** : faible à moyenne ; l'unité vient d'une seule couleur d'accent sur toute l'année.
- **Fonds** : blanc ; un aplat par mois seulement si une photo du mois porte la couleur.
- **Ton des titres** : les mois (« JUILLET »), les mots du client ; pas de lieux en titre sauf nouveau pays.
- **Il interdit** : un fil chronologique cassé pour « faire joli » ; des séries trop longues (sous 15 % du lot) ; une année qui ne ferme pas.

### P6. Séjour court (10 jours au plus), ville ou famille
- **On le reconnaît** : 3 à 10 jours, 40 à 250 photos, une ville ou une région, un couple ou une famille sur une partie seulement des photos (Klervie : 27 % des photos avec visage, 17 % de documents : menus, billets ; Eloise Martinique : 45 %, dont 30 % à 3 visages ou plus ; Candice : 11 %).
- **Structure type** : un chapitre par jour ou par quartier ; sommet = la photo qui résume ; le lieu d'abord, les gens en satellites ; fin sur les gens.
- **Densité** : moyenne. RD : 2,5 à 3 photos par double ; 30 à 40 % de pleines pages (Klervie 15 sur 38).
- **Stylisation** : moyenne. C'est le profil où l'aplat pris dans la ville (brique, ocre) rapporte le plus (couverture de Klervie, de Candice).
- **Fonds** : blanc, un aplat de la couleur des murs.
- **Ton des titres** : un mot de lieu, un mot vrai. « Du Havre à… » une seule fois.
- **Il interdit** : le même lieu trois fois de suite en grande taille ; la capture d'écran en grand ; une carte sans lieu.

### Modificateur : gros lot (300 photos ou plus, RD)
Le profil ne change pas, mais le taux de tri change (voir S-147 et suivantes) et la couche IA passe en planches plus denses (budget 1 € par projet). Exemple du corpus : un lot de 997 photos sur 36 jours (rangé P1) et Candice : 222 photos pour 4 jours.

## Rangement du corpus (avec la preuve)

Colonnes : photos du lot, jours-photo / durée, part de visages (≥1), part à 3 visages ou plus, part de nuit, portrait, constat. Chiffres issus de `cycle-1-2026-11-12/analyse/*.json` (banc du 12/11) et, pour Joëlle, des 164 fichiers du banc du 17/11 ; « à l'œil » = vu en regardant les images.

| album | photos | jours / durée | ≥1 visage | ≥3 | nuit (heure 20 h-5 h) | portrait | profil | preuve |
|---|---|---|---|---|---|---|---|---|
| **Joëlle · Australie** | 164 | 21 jours-photo sur 22 (5 au 26 nov. 2025) ; 141 datées, 23 sans date | non mesuré ; à l'œil 3 vues sur 10 avec des gens, des groupes de 3 et 4 | à mesurer | 5 sur 141 (4 %) ; le coucher de soleil à 19 h est la plus tardive des photos de gens | 36 % (59 sur 164) ; 89 % des photos sont en 21:9 ou 9:19,5 (ratios 2,16 et 0,46) | **P1** | durée, étapes, paysages et détails majoritaires ; aucun GPS ; une œuvre peinte photographiée ; 23 images reçues par messagerie (sans date, 1 398 à 2 000 px) |
| Eloise · Martinique | 40 (44 au brief) | 8 jours | 45 % | 30 % | 0 % | 72 % | **P6** (famille) | 8 jours, groupes de famille ; sans GPS ; titre « La Geffroy family » |
| Klervie · Madrid | 59 | 7 jours | 27 % | 5 % | 3 % | 78 % | **P6** | une semaine, ville ; 17 % de documents ; 3 personnes sur 15 photos |
| Candice · Madrid | 222 (100 au brief) | 5 jours (4 + retour) | 11 % | 2 % | 0 % | 72 % | **P6** + gros lot | Noël à Madrid : 96 photos sur 100 dans la ville ; occasion déclarée « été indien » démentie |
| Japon (un lot de 40 photos) | 40 | 21 jours, 8 lieux | non mesuré | non mesuré | non mesuré | non mesuré | **P1**, lot court pour la durée | 21 jours et 8 lieux (Tokyo, Hakone, Hiroshima, Kyoto…) ; le brief ne donne rien d'autre |
| Test 2 (Mathias) | 65 | 9 jours-photo sur 752 jours | 20 % | 0 % | 0 % | 88 % | **P6** (provisoire) | occasion déclarée « un festival », mais les photos regardées sont de jour, en parc et sur une dune : le dépôt contredit la fiche |
| Merisa · Madère | 92 | 10 jours | 53 % | 0 % | 0 % | 100 % | **P3** | exactement un duo dans les photos à gens (aucune photo à 3 visages) ; 10 jours |
| Lara · Lulu et Laraclette | 52 | 29 jours-photo sur 1 087 jours | 94 % | 0 % | 6 % | 94 % | **P3** | 94 % de photos à visage, jamais 3 visages ; « moments d'amour à travers le monde et les années » |
| Marjorie · Notre histoire | 99 | 24 jours-photo sur 3 042 jours ; 70 sans date | 88 % | 7 % | 8 % (heure) | 83 % | **P3** | selfies, couple, 9 ans ; presque tout est en selfie, un tiers avec stickers |
| Jeanne · 24 h des Hautes-Alpes | 100 | 1 week-end, **aucune date lue** | 14 % (sous-compte : à l'œil, beaucoup de gens) | 4 % | non mesurable | 38 % | **P4** | photos de photographe (filigrane, 5 200 px), voiture orange, un rallye de 24 h ; vues à l'œil |
| Eloise · La vie, les copains | 63 | 22 jours-photo sur 247 | 83 % | 48 % | 30 % | 75 % | **P5** (avec des morceaux de P2) | 247 jours, 7 lieux sans trajet, copains, semi-marathons ; 7 photos sans date ; seul album avec une vraie part de nuit |
| Lot « beta » (997 photos) | 997 | 32 jours-photo sur 36 | 14 % | 0 % | 9 % | 87 % | **P1** + gros lot | 36 jours, aucun lieu nommé ; vu seulement par les chiffres |
| « Lot complet / Bateau » | 19 | non lu | non lu | non lu | non lu | non lu | **P4** probable | **non analysé** : par prudence (client réel), aucune photo ouverte, seul le nom du dossier a été lu |

Lecture : cinq profils sur six ont au moins un album ; **P2 (fête entre jeunes) n'en a aucun**, et P4 repose sur un seul album vu à l'œil. Ce sont les deux profils où les règles sont les plus fragiles.

## Ce que le magazine déjà fait de Joëlle apprend

Source : `test-idml/Australie-Joelle/magazine-corrige.idml` et les deux listes de photos, regardés ce 17/11.
- Le magazine ne couvre **qu'une partie du voyage** : les 64 photos citées sont les 58 photos datées du 5 au 11 novembre et 6 photos sans date. Les 100 autres (12 au 26 novembre, 83 datées et 17 sans date) ne sont ni utilisées ni écartées. Le test « refaire le magazine de Joëlle » doit donc comparer le même sous-ensemble (5 au 11 nov.) ou dire qu'il couvre plus.
- 41 photos utilisées sur 64 (64 %), 23 écartées ; dans le fichier : **14 doubles, 27 pages, 42 cadres photo, 0 cadre de texte** (aucun titre, aucune légende, aucun mot).
- Photos par double : 1, 10, 4, 3, 5, 3, 3, 2, 0, 4, 3, 1, 2, 1 ; moyenne 3,0. 6 doubles sur 14 (43 %) portent 2 photos ou moins ; 4 sur 14 (29 %) en portent 4 ou plus, dont une planche de 10.
- Le tri s'effondre à mesure que le voyage avance : les 5 et 6 novembre gardent 25 photos sur 29 (86 %), le 9 en garde 4 sur 12, le 11 en garde 1 sur 7. Hypothèse : les premiers jours ont été travaillés plus longuement. Une règle de la machine (S-066) lui interdit de recommencer.
- Le dépôt est rangé **à l'envers** (la photo 001 est la plus récente) ; la chronologie vient de la date de prise, jamais du rang de dépôt.
- Sur ce magazine, Mathias a **bien fait** de laisser de grandes photos seules (cinq doubles à 1 ou 2 photos sur 14) : c'est ce que les pros font aussi, je ne peux pas dire qu'il a fait mieux. Il a **moins bien fait** que les pros sur le texte (aucun mot, ni titre, ni légende) et, d'après les chiffres, sur la constance du choix d'un bout à l'autre du voyage.
