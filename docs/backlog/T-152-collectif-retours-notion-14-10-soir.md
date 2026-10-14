---
id: T-152
titre: Les retours du 14/10 au soir (Notion « Lancement admin atelier Prestation B2B ») : photos rangées en dossiers, liens à part, atelier réorganisé
etat: en-cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-14
---
## Ce que Mathias a écrit (Notion, section sous le séparateur, 14/10/2026) et dit
- Manque la page de prise de rendez-vous qui ne renvoie pas vers Google Agenda (voir la maquette).
- La boîte « nom de l'édition » sous le logo : à quoi sert-elle ?
- Documents : « Ouvrir » dans la même page (fenêtre), et « Télécharger » avec l'icône habituelle.
- Messages : répondre directement à un message ou à un document (« reply ») ; quand le client fait
  une demande, l'atelier peut répondre par une proposition.
- « Signaler » sous les photos : à retirer, ça ne sert à rien.
- Atelier : une messagerie avec les conversations à gauche, les notifications, et le dossier du
  client à droite ; la fiche avec toutes les infos dans une longue colonne n'est pas possible.
  (Plus haut dans la page : un planning des rendez-vous, et les ateliers B2C et B2B connectés.)
- Supprimer un lien ; changer son nombre maximum de photos selon ce qu'il reste ; filtrer par personne.
- Les acceptations d'une proposition : est-ce que ça fait foi ?
- Photos : le visuel de l'ancienne maquette (les grands chiffres en tête, la sélection marquée en
  gros) est plus clair. La présélection toujours ouverte n'est pas optimale ; « désélectionner » ne
  sert que dans un petit dossier. On se perd sur l'origine des photos : le responsable dépose sous
  plusieurs noms, il faut que ce soit clair, avec des dossiers qu'on range en glissant.
- « Choisir un dossier » n'a pas de sens : le premier dépôt va au même endroit, les suivants sous le
  nom choisi (existant ou nouveau = nouveau dossier), et on range ensuite. Il faut voir clairement
  OÙ on dépose, et les chiffres de l'envoi ne sont pas assez en avant.
- Les liens : voir « bellajour.com/projet », clair et beau pour suivre les photos de chaque personne
  (page derrière une connexion : capture demandée à Mathias).
- À l'oral : trop de liens et de « copier le lien » partout ; le tableau de bord est bien, mais un
  dossier cliqué ne mène nulle part ; la présélection ne sert à rien ; tout doit rester simple à
  2 000 ou 3 000 photos ; enlever les boutons inutiles, regrouper.

## Les propositions (maquettes, canevas https://claude.ai/artifact/5G4LC7RG1s6iiEAbZDEe2W,
## troisième rangée et suivantes ; copie dans `docs/produit/collectif/maquettes/propositions-14-10-soir/`)
1. **Photos rangées en dossiers** (PhotosDossiers) : les grands chiffres en tête ; à gauche « Toutes
   les photos », « Ma sélection », « Déposées par vous » (dossiers et sous-dossiers, glisser pour
   ranger, double clic pour renommer), « Arrivées par les liens » (un dossier par lien, une ligne
   par personne dedans : le filtre par personne). Plus de pastilles de filtres, plus de barre de
   présélection, plus de « Signaler ». La sélection : un bord et une pastille cochée ; « Sélectionner
   tout ce dossier » ; on désélectionne dans « Ma sélection ».
2. **Les liens dans leur onglet** (PhotosLiens) : une carte par lien, chaque personne avec sa barre
   (« 27 / 30 »), un seul bouton « Partager » (QR, WhatsApp, mail, copier dedans), et un menu
   « … » : changer le nom, changer le nombre de photos (jusqu'à ce qu'il reste à l'édition),
   supprimer le lien (il ne reçoit plus rien, ses photos restent).
3. **Déposer = choisir où** (EnvoiDossier) : les dossiers existants en pastilles ou un nouveau nom ;
   un seul bouton « Choisir des photos » (un dossier de l'ordinateur se glisse toujours) ; pendant
   l'envoi, le compte en très grand.
4. **Tableau de bord** (TableauPhotos) : chaque dossier de la carte Photos mène à ses photos.
5. **Documents** (DocumentApercu) : le document s'ouvre dans une fenêtre de la page, « Télécharger »
   avec son icône.
6. **Répondre à un message** (MessagesReponse) : « Répondre » au survol, la citation au-dessus de la
   zone d'écriture et dans la bulle ; l'atelier répond à une demande par une proposition.
7. **Menu** (MenuEdition) : le nom de l'édition en simple texte sous le logo, sans la boîte qui
   ressemblait à un sélecteur d'éditions (on n'en a qu'une par lien).
8. **Atelier, messagerie** (AtelierMessagerie) : conversations à gauche (non lus, « à traiter
   aujourd'hui »), le fil au centre, le dossier du client à droite ; un rail Dossiers, Éditions,
   Messages, Planning, Styles.
9. **Atelier, fiche en onglets** (AtelierFiche) : l'en-tête dit l'étape et le geste suivant ; Vue
   d'ensemble en cartes ; Magazines, Photos, BAT, Messages, Documents, Rendez-vous, Réglages,
   Journal en onglets.

## Ce que ça a demandé (fait)
- Dossiers et sous-dossiers SANS table : un dossier est le NOM sous lequel le responsable dépose
  (`collectif_photos.deposant`), un sous-dossier s'écrit « Parent / Enfant » (un seul niveau).
  Ranger ou renommer réécrit ce nom (`src/lib/collectif/dossiers.ts`, pur). Aucune migration.
- Supprimer un lien : `collectif_provenances.retire_le` (un marqueur, jamais un DELETE) ; son
  plafond se change avec la même règle qu'à la création.
- Répondre à un message : `collectif_messages.reponse_a`. Les deux colonnes sont dans la migration
  `20261018_collectif_liens_reponses.sql` (écrite, PAS appliquée).
- Le document dans la page : deux adresses signées, l'une s'affiche, l'autre télécharge.
- La messagerie de l'atelier et la fiche en onglets : de l'écran, les données existaient.

## Les réponses de Mathias (14/10 au soir)
- La capture de bellajour.com/projects/…/upload : une inspiration ; **le bleu de la capture est
  le bleu de Bellajour** (`#4a90d9`, `--bj-action`), à mettre en mode jour.
- Un seul niveau de sous-dossiers « me suffit largement » ; rester très simple, c'est pour trier.
- La sélection : indécis ; gardée en dossier discret « Ma sélection ».
- Rendez-vous (question 5) : « OK » tel quel, Google relié plus tard.
- Les particuliers dans la messagerie : pas pour l'instant ; mais l'atelier doit être LE MÊME
  pour les deux, un commutateur et non des boutons, « un logiciel qui combine tout ».

## Ce qui est fait (14/10 au soir, branche `feat/collectif-retours-ux-1`)
- Photos en dossiers, onglet « Les liens » (Partager, changer le nom, le nombre de photos selon ce
  qu'il reste, supprimer), dépôt « Dans quel dossier ? », tableau de bord dont chaque dossier
  mène à ses photos, plus de « Signaler », le bleu en mode jour, l'édition sans boîte (f45405f).
- Documents ouverts dans la page avec l'icône de téléchargement ; « Répondre » à un message des
  deux côtés ; « Répondre » à un document depuis Documents (e9468d4).
- L'atelier : la barre commune et le commutateur « Particuliers | Éditions » sur chaque écran ;
  la messagerie (conversations, à traiter aujourd'hui, fil, dossier du client) ; la fiche d'une
  édition en onglets (b1f595d).
- Vérifié à l'écran le 14/10 (localhost:3000, « Essai révision (Claude) ») : nuit, jour, 375 px ;
  ranger, sortir, renommer ; menus des liens ; supprimer un lien et répondre répondent 503 en
  nommant la migration, sans rien écrire.

## Reste
- Mathias applique `20261017` et `20261018`, puis : vérifier en SQL, supprimer un lien d'essai,
  répondre à un message des deux côtés.
- Question 4 (l'acceptation d'une proposition fait-elle foi ?) : toujours ouverte.
- Glisser un dossier ne marche qu'à la souris (pas au doigt) : sur téléphone, renommer et
  déposer suffisent ; à revoir si le besoin se présente.

## Les questions posées à Mathias
1. Une capture de « bellajour.com/projet » (la page demande une connexion).
2. La sélection : la garder comme dossier « Ma sélection » (proposé), ou la retirer tout à fait ?
3. Sous-dossiers : un seul niveau suffit-il ?
4. L'acceptation d'une proposition « fait-elle foi » ? Aujourd'hui elle est tracée (qui, quand, quel
   document) mais ne paie rien et ne signe rien ; à trancher avec la rédaction des propositions.
5. Rendez-vous : la page dans l'espace existe (D23) et ne s'affiche qu'une fois Google relié ;
   relier Google (guide pas à pas prêt), ou un repli « proposez vos créneaux » sans agenda ?
6. Les dossiers des particuliers (B2C) dans la même messagerie de l'atelier : oui ?
