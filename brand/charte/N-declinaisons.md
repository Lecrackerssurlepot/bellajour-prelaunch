# N. Déclinaisons hors site

## Mails (Brevo)

- **Source des valeurs** : `brand/build/mail.json`, généré. Les styles sont écrits en ligne, à partir de ces valeurs.
- **Structure** : tableaux HTML, largeur `mail.largeur` (600 px), marges `mail.marge` (24 px), une seule colonne.
- **Polices** : `police.mail.titre` (Georgia) et `police.mail.texte` (Helvetica, Arial). Pas de webfont.
- **Couleurs** : papier `#ffffff` et encre `#111111`, un bouton principal en encre, rayon pilule.
- **Variations** (signatures, points) : **jamais** dans les mails pour l'instant.
- **Mode sombre forcé** (Gmail, Outlook, Apple Mail) :
  - `<meta name="color-scheme" content="light only">` et `supported-color-schemes` ;
  - ~~deux logos, encre et blanc, avec bascule `@media (prefers-color-scheme: dark)` là où c'est lu~~ :
    remplacé le 26/11 par le bandeau nuit (ci-dessous), parce que Gmail sur iPhone ne lit pas cette bascule ;
  - aucun texte dans une image ;
  - un bouton en tableau, avec bordure d'encre, pour rester lisible même inversé.
- **Direction (Mathias, 25/11), à concevoir en phase 6** : les mails actuels sont trop sobres. Il faut un effet marquant :
  - des **magazines empilés**, comme sur le site : la couverture photo apporte la couleur que la charte n'a pas ;
  - des **gros textes**, en jouant sur les graisses (Fraunces fin contre gras) pour un côté atelier ;
  - toujours une structure qui tient (tableaux, 600 px, mode sombre forcé).
- **Envoi** : aucun envoi réel. Les tests partent seulement vers l'adresse de Mathias, et sur son accord à chaque fois.

### Le gabarit commun (26/11)

Une seule coquille : `scripts/mails-charte.mjs`. Les mails de l'atelier et du compte
(`mails-atelier.mjs`) et ceux de Noël et de la carte cadeau (`mails-noel.mjs`) la remplissent ; aucun
ne redessine un bouton ni un en-tête. Elle lit ses valeurs dans `brand/build/mail.json`. Le harnais
(`scripts/verif-mails-charte.ts`, lancé par `verif-atelier.ts`) vérifie ces règles sur chaque mail.

- **En-tête : un bandeau nuit**, avec le logo papier en PNG (`public/images/v2/mail/logo-papier-420.png`,
  tiré du logo vectoriel par `brand/scripts/logo-mail.mjs`, affiché à 140 px). C'est l'alternance de C :
  la page est papier, le bandeau au-dessus est nuit. Pourquoi pas le logo encre sur le papier : Gmail sur
  iPhone ignore `prefers-color-scheme` et inverse les couleurs, pas les images ; un logo encre y disparaît
  sur le fond devenu noir. Le bandeau est peint deux fois, `bgcolor` et
  `background-image: linear-gradient(…)`, parce que Gmail n'inverse pas une image de fond : il reste
  noir, le logo reste lisible.
- **Une photo ouvre chaque mail** (piste C, choisie par Mathias le 26/11) : sous le bandeau, une vraie
  photo de magazine pleine largeur (600 px, sans coin arrondi), `photoEnTete` de la coquille. Les mails
  de l'atelier et du compte prennent `PHOTO_MAIL` (provisoire, en attendant les visuels de Mathias)
  sauf s'ils ont la leur ; ceux de Noël gardent leur scène. Les mails de la carte cadeau n'en ont pas :
  la carte est leur image. Au-dessus du titre, le titre du numéro en étiquette quand on le connaît.
- **Corps** : papier `#ffffff`, encre `#111111`, texte doux `#626262` pour le pied et les étiquettes,
  filets `#dedede`. Rien d'autre : ni cuivre, ni crème, ni bleu.
- **Marges** : `mail.marge` (24 px) de chaque côté, au téléphone comme sur ordinateur.
- **Tailles** (prises dans l'échelle de D, en px fixes) : titre 52 px (40 px au téléphone), interligne
  1,04 (piste C, 26/11) ; chapo 18 px, interligne 1,5 ; texte 16 px, interligne 1,6 ; pied 14 px ;
  étiquette 12 px en capitales, approche 0,12 em ; bouton 15 px.
- **Le bouton** : un tableau, cellule encre bordée d'encre, rayon pilule, 52 px de haut, texte papier
  en 15 px ; une forme VML pour Outlook sous Windows. Inversé par un mode sombre, il devient une pilule
  claire à texte foncé : il se lit toujours. **Un seul par mail.**
- **Un lien secondaire** (suivi, reçu, conditions) : encre, en gras, suivi d'une flèche, jamais
  souligné (règle de A).
- **Les encarts** (chiffres, crédit, mot de l'atelier, récapitulatif) : fond papier, filet `#dedede`,
  rayon `rayon.bloc`, étiquette en haut. Le récapitulatif suit A : libellé à gauche, valeur à droite.
- **Le bloc nuit** : seulement la carte cadeau, au plus un par mail. Même double peinture que le bandeau ;
  son texte clair passe par la parade Gmail (`u + .body`, fusion `screen` puis `difference`), sans quoi
  Gmail l'assombrirait sur un fond resté noir.
- **Images** : JPEG ou PNG hébergés sur le site, jamais WebP (Outlook ne le lit pas), toujours un `alt`.
  Une couverture est une vraie photo de magazine (B, G).
- **Mode sombre** : `<meta name="color-scheme" content="light only">` et `supported-color-schemes`. Pas
  de second jeu de couleurs : le gabarit est fait pour survivre à l'inversion, pas pour la piloter.
- **Pied** : un filet, `@bellajour__`, puis la ligne de la maison. Pas de signature répétée, pas de
  canson, pas de petits points (variations exclues).
- **Polices** : `police.mail.*` seulement, Georgia et Helvetica. Aucun `@import` de police : Fraunces et
  Inter Tight ne sont pas nommées dans un mail, une police qui ne s'affiche que chez qui l'a installée
  ferait deux mails différents.
- **Liens** : tout lien vise `https://www.bellajour.fr` (ou un paramètre que le code construit sur
  `origineDuSite`), sauf `@bellajour__` (Instagram), le suivi du transporteur et le lien de
  désinscription des campagnes.
- **Hors gabarit, à trancher** : les mails de l'Édition collective et des rendez-vous (`pageMail`,
  `src/lib/collectif/mailsTextes.ts`) gardent leur Porcelaine bleue, validée le 28/10 et tenue par
  `verif-collectif.ts` : l'espace collectif n'est pas encore passé à la charte.

## Brochures (PDF numériques)

Tranché le 25/11 : des PDF numériques, **pas** d'impression.
- **Espace couleur** : RVB (sRGB). Pas de CMJN, pas de fond perdu, pas de traits de coupe.
- **Format** : A4 portrait (210 × 297 mm), tranché le 25/11 par Mathias. Il se lit à l'écran et s'imprime partout. Le 16:9 paysage n'est pas retenu.
- **Typo** : les quatre rôles de D, incorporés au PDF (licences OFL : c'est permis).
- **Marges** : 15 mm. Logo en haut à gauche, numéro de page en étiquette.
- **Poids** *(proposé)* : 10 Mo au plus. Images en 150 dpi.

## Réseaux sociaux

| Format | Taille (px) | Zone de sécurité *(proposée, à confirmer avec les gabarits Instagram du moment)* |
|---|---|---|
| Post carré | 1080 × 1080 | 60 px de chaque côté |
| Post portrait (par défaut) | 1080 × 1350 (4:5) | 60 px de chaque côté |
| Story, reel | 1080 × 1920 (9:16) | 250 px en haut, 340 px en bas (interface), 60 px sur les côtés |
| Couverture de reel | 1080 × 1920, lue en 1080 × 1440 au centre | Garder le texte dans le carré central |

**La règle** : une photo de numéro, un titre court en Fraunces (ou une phrase Interlope seule),
le logo petit. Fond papier ou photo pleine, jamais un aplat coloré.

**Priorité (Mathias, 25/11) : la typo se lit, quoi qu'il y ait derrière.** Sur une photo, le texte
pose toujours le voile `couleur.voile.photo-*` (dégradé noir en haut et en bas). Les gabarits
précis se feront avec Louis : des structures intéressantes, pas un modèle unique.

## Mockups et couvertures

- **Les mockups** se font avec le magazine 3D de la phase 3 (`brand/assets/3d/magazine/`), sous les angles nommés.
- **La couverture** porte toujours une vraie photo.
- **Le titre imprimé** est en Instrument Serif (`police.magazine`). La couleur du titre passe au noir quand la photo est claire (luminance supérieure à 0,6).
