# Recette du 21/11/2026 : un événement d'une journée, photographié à l'appareil

**Qui** : Mathias, dans l'éditeur en production. **Quoi** : « Lire les photos » puis « Composer » sur un dossier d'un inconnu
(100 photos d'appareil photo, sans date, beaucoup de photos proches), fiche « événement », style « stylisé ».
**Coût IA** : 0,40 $ (gpt-5.4 planches + gpt-5.1 regard fin sur 45 photos). Ses mots : `tunnel/RETOURS-MATHIAS.md`, M-58 à M-71.

## Ce que la machine a rendu (relu dans la proposition gardée par le navigateur)

| Mesure | Valeur | Ce que ça dit |
|---|---|---|
| Pages | 56 (« tout garder », choisi par l'atelier) | 97 photos posées sur 100 ; les 3 autres sont EN COUVERTURE (M-10) : c'est « les photos enlevées » |
| Mesures locales au moment de composer | **15 photos sur 100** | 85 photos sans zone chaude ni visages : recadrées à l'aveugle |
| Fautes de recadrage au contrôle | 37, dont 33 à « 28 % » exactement | une valeur identique partout = pas de mesure : sans carte, toute la photo compte comme cœur, tout rognage est une faute |
| Gabarits distincts | 19 pour 29 doubles | `E-S1` posé 10 fois, `G-P3-a` 10 fois (« répétition forcée : aucune autre forme ne tient le rôle ») |
| Places de texte | 38, dont 6 remplies | trois noms de lieux sûrs (lus sur des panneaux) RETIRÉS : « aucune place lisible » |
| Vignettes trop petites | 9 photos à 22 cm² (moins de 35) | les doubles denses à six photos |
| Pages presque vides | 4 (20 à 26 % imprimés) | faute M-07 laissée |
| Fonds | 19 doubles sans fond, 9 au même beige | « c'est souvent la même chose » |
| Chapitres | 4, par ordre des fichiers | aucune date : l'ordre des numéros d'appareil fait la chronologie |
| Couverture | `CV-01`, titre sur fond beige, 4e en timbre | contraste non mesuré (M-66) |
| Dernière page | « les gens ensemble, du dernier tiers » | la règle a pris une photo de gens, pas la plus forte du groupe (M-68) |

## L'incident : le magazine n'était pas enregistré

Deux pages portaient un gabarit enregistré par l'atelier (`M-…`) posé par le compositeur SANS la copie de ses cadres. La
sauvegarde refuse alors le magazine ENTIER (forme exacte, `contenuValide`) : la barre disait « Pas enregistré », rien ne partait
au serveur. À la réouverture, la copie locale, refusée elle aussi, a été remplacée par celle du serveur (2 doubles du 10/11).
La copie complète avait été relue juste avant : elle a été réparée (les cadres du gabarit remis) et reposée, puis envoyée au
serveur (version 6, 29 doubles). Corrigé dans le code (M-58) : le compositeur copie les cadres, la copie refusée est mise de côté.

## Les causes, par couche

1. **Lecture locale (cause n° 1 des recadrages)** : la mesure de fond posait sa lecture par paquets de 150 (plus que l'album) et
   « Composer » ne l'attendait pas. Corrigé : « Composer » mesure ce qui manque et attend (15 s au plus par photo).
2. **Zone chaude** : c'est une carte de CONTRASTE (ce qui ressort), sans modèle ; elle marque un panneau ou un rocher autant qu'une
   voiture. Elle ne sait pas ce qu'est le sujet. Le regard fin de l'IA dit déjà en mots ce qu'il faut couper (« légèrement couper
   rocher droit ») mais ce texte n'est lu par personne. Piste : demander à l'IA la BOÎTE du sujet principal (M-63).
3. **Gabarits (cause n° 1 de la monotonie)** : pour un rôle et un nombre de photos donnés, trop peu de formes gardent les personnes
   entières ; la règle « jamais deux fois de suite » cède (P3 passe avant P2) et la même forme revient. Et trop peu de formes ont une
   place de texte : les lieux sûrs tombent. M-59, M-60.
4. **Règles absentes** : scène à plusieurs angles (M-69), couleur selon le style (M-62), contraste du titre (M-66), fin de groupe (M-68).
5. **Questions** : la fiche n'a rien demandé du format voulu pour un lot de photos proches (M-65) ; les questions actuelles sont
   trop techniques pour être répondues (M-71).

## Ce qui a plu
Le fond qui reprend une couleur de la photo ; le dos adapté aux pages ; un ensemble « joli ».
