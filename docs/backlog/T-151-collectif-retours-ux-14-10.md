---
id: T-151
titre: Les retours de Mathias sur l'espace client de l'Édition collective (14/10)
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-14
---
## Ce que Mathias a dit (14/10/2026), tel quel
Il teste en local. Il préfère qu'on modifie les maquettes AVANT de grosses modifications de
code, et que je pose des questions sur ce que je ne comprends pas.

1. Mode sombre = logo blanc.
2. Modifier le style ne doit pas renvoyer vers la page du style, mais montrer juste ce qu'on
   veut modifier, avec un retour facile vers le style ensuite ; les choix faits s'affichent
   toujours en premier.
3. Un contenu envoyé à l'atelier (le logo, par exemple) se revoit en cliquant dessus, avec un
   bouton « Remplacer ». Plusieurs dossiers possibles, renommés d'un double clic.
4. Proposition : plus de styles « en bloc ». « Tout » montre tout en vrac pour composer ; une
   catégorie (typographies, par exemple) met en haut celles liées au style déjà choisi ; « voir
   tout le style » pour le prendre en entier ou en partie.
5. (Niveau supérieur) Le mail de partage du lien des photos adapté à l'événement et au nom du
   groupe.
6. L'envoi des photos s'affiche au milieu, et on doit pouvoir le rouvrir (capture d'écran du
   14/10, 13:19:49, pas encore reçue).
7. La présélection n'est pas claire : tout sélectionner et tout désélectionner simplement.
8. Impossible de renvoyer des photos depuis le même compte.
9. « Qui a déposé » et les liens doivent être ensemble.
10. Les liens des participants sont un peu partout, ce n'est pas clair.
11. Citer un document qu'on a soi-même envoyé (le logo) dans les messages.
12. Dans les messages, Entrée envoie.

## Ce que j'en ai compris, et ce que je demande (14/10)
- Clairs : 1, 5, 7, 9, 10, 11, 12.
- À préciser : 2 (depuis quel écran ?), 3 (quels dossiers, et « sur l'atelier » = côté client ou
  côté atelier ?), 4 (la règle « tout l'intérieur suit le style, seule la couverture peut venir
  d'un autre » tombe-t-elle ?), 6 (la capture), 8 (quel écran, quel message, mêmes photos ou
  nouvelles ? un fichier déjà envoyé est volontairement sauté).

## Les maquettes (14/10, en autonomie, à la demande de Mathias)
Canevas https://claude.ai/artifact/5G4LC7RG1s6iiEAbZDEe2W, copie dans
`docs/produit/collectif/maquettes/propositions-14-10/`. **Validées par Mathias le 14/10**
(« tout le reste me va »), avec une retouche : la présélection se marque par un BORD autour de
la photo, sans case ni coche (trop de photos), et deux boutons « Tout sélectionner » / « Tout
désélectionner ». Le menu de la maquette a des carrés à la place des icônes : l'espace garde
ses vraies icônes.

## Ce qui a été fait (branche `feat/collectif-retours-ux-1`)
- 14/10 : logo blanc en mode nuit (1) et Entrée envoie (12).
- 14/10 : la page Photos de la maquette validée :
  - (7) la présélection se marque par un BORD (tracé en dedans : la tuile rogne sa peinture, un
    contour extérieur ne se voyait que dessous), « Tout sélectionner » / « Tout désélectionner »
    (une photo signalée n'entre jamais dans un « tout »), journalisés ;
  - (9, 10) « Qui a déposé » réunit chaque source, son nombre de photos et SON lien (Copier,
    Partager, QR en grand) ; plus de bouton de copie dans l'en-tête ; collecte close, ni dépôt
    ni lien ; le tableau de bord lit les mêmes sources (`sources.ts`) ;
  - (5) le message de partage est écrit pour le groupe, l'organisation et l'événement
    (`partage.ts`), à retoucher avant WhatsApp, Mail ou copie ;
  - (6, 8) la fenêtre d'envoi vit dans la coquille, la pastille « Envoi en cours » de chaque
    en-tête la rouvre ; « déjà là » est expliqué, un fichier choisi deux fois est compté
    (« Choisies deux fois, sautées ») au lieu d'être ignoré en silence ; un second lot ajouté
    pendant l'envoi garde SA provenance (défaut latent corrigé dans `moteur.ts`).
- 14/10 : (3) les contenus : un contenu a plusieurs fichiers ; un clic sur une puce reçue montre
  ce que l'atelier a reçu (aperçu d'une image, « Ouvrir »), « Remplacer » (l'ancien devient une
  ancienne version, gardée à l'atelier) et « Ajouter un autre fichier » ; le mot du dirigeant
  se relit et se modifie. Un dossier de photos (un lien, ou un dossier du responsable) se
  renomme d'un double clic, sur Photos et sur le tableau de bord ; la fenêtre d'envoi demande
  le nom du dossier.
- 14/10 : (11) « Citer un de vos envois » dans le « + » des messages ; la bulle et la fiche de
  l'atelier le montrent.
- **Migration `20261016_collectif_envois.sql` appliquée par Mathias le 14/10**, vérifiée en SQL ;
  « Remplacer » et « Citer un de vos envois » rejoués pour de vrai sur « Essai technique » (la
  donnée arrive en base).

## Ce qui reste
- (2, 4) Le style « tout en vrac » et « modifier une partie » (maquettes Main, StyleTypos,
  StylePartie) : la règle « l'intérieur suit le style » tombe ; changement du modèle de données.
- T-150 : décoder les HEIC à l'envoi (aperçu et doublons).
