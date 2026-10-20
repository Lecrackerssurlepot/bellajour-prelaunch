# Propositions du 20/10/2026 : Audencia, huit bateaux (T-193, T-196, T-198, T-199, T-200)

Maquettes AVANT le code. Publiées pour Mathias le 20/10 : https://claude.ai/artifact/3fvFwDb6HKzZx3bw5bQPpy (les neuf planches en images, les seize questions avec une recommandation chacune). Rien n'est codé, aucun fichier de `src/` n'a changé.
Ouvrir `planches.html` dans un navigateur (un seul fichier, polices Google Fonts, aucune image
externe : les photos sont des dégradés, les captures d'aujourd'hui sont incluses dans le fichier).
En haut, « Jour et nuit / Jour / Nuit » montre les deux modes ou un seul. Répondre par le numéro
de la vue (1A, 7B…).

Couleurs et formes : les jetons RÉELS de `src/app/edition/[token]/espace.css` (Porcelaine le
jour, Charbon la nuit, verre, arrondis 28 / 24 / 16 / 14), Cormorant Garamond 400 et DM Sans.
Ordinateur dessiné à 1440 × 900, téléphone à 375 × 812 ; la page ne fait que les réduire si la
fenêtre est plus étroite. Noms, chiffres et dates sont des exemples.

## Les planches

| N° | Écran | Vues | Ticket |
|---|---|---|---|
| 1 | Mathilde · Photos · ordinateur | 1A Par lien · 1B Bateau 1 et ses personnes · 1C Tout, filtré, trois photos cochées | T-193, T-199 |
| 2 | Mathilde · Photos · téléphone 375 | 2A haut · 2B en descendant · 2C Par lien · 2D Bateau 1 · 2E Filtrer · 2F Cocher | T-193 |
| 3 | Agrandir une photo | 3A ordinateur · 3B téléphone · 3C après Supprimer · 3D après Ne pas publier | T-199 |
| 4 | Une personne | 4A sa fiche · 4B fusionner · 4C côté atelier · 4D téléphone · 4E renommer | T-198 |
| 5 | La corbeille | 5A ordinateur · 5B téléphone · 5C après Restaurer | T-199 |
| 6 | Participant, première visite | 6A en arrivant · 6B rempli | T-198, T-200 |
| 7 | Participant, l'album du bateau | 7A Tout le bateau · 7B envoi en cours · 7C terminé · 7D supprimer les siennes | T-199 |
| 8 | Participant qui revient | 8A même téléphone · 8B nouveau téléphone · 8C « Ce n'est pas toi ? » | T-198 |
| 9 | Pages d'état | 9A lien mort · 9B pas encore ouvert · 9C collecte terminée | T-196 |

Chaque vue existe en jour et en nuit, sauf 4C : l'atelier est en Porcelaine seulement.
Les planches 1, 2, 6, 7 et 9 portent en bas « Aujourd'hui », la capture de l'écran actuel.

## Les choix que j'ai faits

1. **Une seule colonne de LISTES** pour trier et filtrer (Lien, Personne avec recherche, Jour,
   Afficher : Doublons, Ma sélection, Ne pas publier, Corbeille), dans le panneau. La liste qui
   navigue est celle qui filtre : ouvrir « Bateau 1 » coche ce lien et la liste devient
   « Personnes · Bateau 1 ». La colonne retirée le 15/10 était un arbre de dossiers qui
   s'allongeait ; celle-ci est faite de sections repliables.
2. **« Cocher »** pour le geste du moment, **« Ma sélection »** (l'étoile) pour ce qui va au
   magazine : deux mots pour deux choses. « Tout cocher (N) » coche la vue entière, le nombre est
   dans le bouton.
3. **Toucher une photo l'agrandit** (planche 3). Aujourd'hui elle entre dans Ma sélection ;
   l'étoile au survol garde ce geste en un clic.
4. **La barre d'actions** : en bas du panneau sur ordinateur, fixe sous le pouce sur téléphone.
   Ajouter à ma sélection, Retirer de ma sélection, Ne pas publier, Supprimer.
5. **Supprimer = corbeille 30 jours**, sans fenêtre de confirmation pour une photo (« Annuler »
   quelques secondes), avec confirmation pour le participant sur ses propres photos.
6. **Téléphone : plus rien ne défile de côté.** Les trois chiffres deviennent une ligne, une
   seule barre (Tout / Par lien, Filtrer, Cocher), les filtres dans une feuille du bas, grille de
   4 colonnes avec les initiales. La première photo passe de ~680 px à ~300 px du haut.
7. **Participant : l'email d'abord**, puis prénom et nom : c'est l'email qui le fait reconnaître
   sur un autre téléphone, et dès qu'il est tapé.
8. **L'accord** : le texte du 17/10 inchangé, plus une phrase proposée, encadrée en pointillé :
   « Les personnes de « Bateau 1 » verront aussi les photos que j'envoie ici. »
9. **« Photos seulement : les vidéos ne partent pas »** au-dessus du bouton, donc avant le choix.
10. **La page « Ce lien ne fonctionne plus »** ne nomme ni l'édition ni l'organisation (pas
    d'annuaire, PRD §10) : elle ne peut donc ni tutoyer ni vouvoyer, sa phrase n'emploie aucun
    des deux.
11. **Les chiffres en Cormorant passent en chiffres modernes** (`lining-nums`) : aujourd'hui
    « Bateau 1 » se lit « Bateau I » dans le titre de la page Photos (capture 1B d'aujourd'hui).
12. Le logo est écrit en Cormorant italique (pas d'image externe permise) : c'est une
    approximation de la signature, pas le vrai dessin.

## Ce que j'ai vu sur l'écran d'aujourd'hui (captures du build)

- **À 375 px, le champ « Ton nom » du dépôt déborde de la carte** : son bord droit est coupé
  (`depot.css`, la grille prénom / nom ne laisse pas ses colonnes rétrécir). Visible sur les
  captures de la planche 6.
- **Pendant un envoi, « 0 photo reçue · 18 en cours » et la barre vide 6 secondes après le
  choix, alors que 7 photos étaient déjà au coffre** : le compte n'avance qu'à la confirmation
  groupée (toutes les 15 s). Sur un téléphone, ça ressemble à un envoi bloqué. Planche 7.
- « Merci Léa, 18 photos reçues » : en Cormorant sans chiffres modernes, le « 1 » se lit « I ».
- Un lien de dépôt inconnu ou supprimé ouvre la page 404 du site (« Découvrir les magazines »,
  « Vous cherchiez votre numéro ? »). Planche 9.
- Photos, 375 px : la première photo arrive vers 680 px du haut ; les rayons et les personnes
  défilent de côté (la page elle-même ne déborde pas : 375 sur 375).

Comment ces captures ont été faites : le build du worktree (main au 20/10, `c95b302`) servi
sur le port 3017, ses lectures serveur sur un faux Supabase local (port 3018) qui ne connaît
que l'édition d'exemple, et chaque route `/api/collectif/*` du navigateur servie par
interception dans Chrome headless (CDP). L'envoi de la planche 7 a tourné sur le vrai moteur
avec 18 fichiers JPEG locaux ; le coffre et la confirmation étaient simulés. Aucune base,
aucun coffre, aucun mail, aucune écriture.

## Questions ouvertes pour Mathias

1. **La phrase de l'accord** (planche 6) : la mienne, la variante courte « Ces photos seront
   visibles par les personnes de « Bateau 1 » », ou une autre. C'est un texte légal versionné
   (T-184) : une nouvelle version quand tu la valides.
2. **L'email** : peut-on écrire qu'il ne sert qu'à reconnaître la personne, ou servira-t-il à
   écrire aux participants (relance, magazine fini) ? Je n'ai rien promis à l'écran.
3. **Sans vérification**, qui tape l'adresse de quelqu'un envoie en son nom et lit son prénom et
   son nombre de photos (planche 8). D'accord pour l'instant ? Un code par mail plus tard, comme
   pour le responsable (T-154) ?
4. **L'accord sur un nouveau téléphone** : redemandé (dessiné) ou repris de la première fois ?
5. **« Cocher »** te va, ou tu préfères « sélectionner » partout ?
6. **Toucher = agrandir** (le geste du 14/10 change) : d'accord ?
7. **« Ne pas publier »** : la photo reste-t-elle dans l'album du bateau des participants
   (proposé : oui, seul l'atelier l'écarte) ?
8. **Supprimer** : sans confirmation pour une photo (proposé), avec confirmation à partir de
   combien de photos cochées (je propose 10) ?
9. **La corbeille** : « Effacer maintenant » (définitif), pour l'atelier seul ou pour personne ?
   Le lien d'équipe la voit-il ?
10. **Le plafond** (60 par personne dans l'exemple) : compté par personne (email) plutôt que par
    téléphone ? Une photo supprimée par son auteur libère-t-elle sa place ?
11. **La fusion** se défait-elle (proposé : oui, depuis le journal de l'atelier) ? Le participant
    peut-il corriger son nom lui-même (proposé : non) ? L'atelier voit-il l'adresse en entier ?
12. **Les vignettes du téléphone** : initiales (proposé) ou prénom ? 4 colonnes (proposé) ou 3 ?
13. **Dans l'album**, le prénom des autres (proposé) ou le nom complet ?
14. **« Pas encore ouvert »** n'existe pas aujourd'hui : une édition reçoit dès sa création. Il
    faut un réglage « ouverture du dépôt » (jour et heure) dans la fiche ; sans lui, la vue 9B
    n'a pas lieu d'être.
15. **Après la clôture**, l'album du bateau reste-t-il visible (bouton en pointillé, 9C) ?
16. **Le mode de la page des participants** : suivre le réglage clair / sombre du téléphone ? Elle
    n'a pas de bouton soleil / lune et elle est toujours Charbon aujourd'hui.

## Pour qui reprend ce fichier

`planches.html` a été produit par un petit générateur hors du dépôt : chaque écran y est écrit
DEUX fois (jour, nuit). Une retouche à la main doit toucher les deux copies.
