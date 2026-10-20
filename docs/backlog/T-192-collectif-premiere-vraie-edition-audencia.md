---
id: T-192
titre: Avant la première vraie édition (Audencia), l'envoi des photos perdait ou doublait des photos sur iPhone et en mauvais réseau, le nom des participants changeait, et le mur des styles montrait des visuels pas prêts
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Je veux que tu vérifies […] dans les pires conditions de connexion, via iPhone, via Samsung,
via Android, via ordinateur, tous les liens vont fonctionner, les photos vont bien être stockées,
il ne va pas y avoir de bug […]. S'ils mettent des photos au fur et à mesure et qu'ils se
connectent plusieurs fois, même avec un lien différent, il ne faut pas qu'ils puissent changer
leur nom […]. Elle peut en envoyer deux petites une seule fois, puis le refaire quatre fois, et
après en envoyer 500 d'un coup, ça doit pouvoir fonctionner. » Et pour le style : « mettre des
visuels jolis, au moins nos magazines, et le mettre en blocage pour l'instant du reste. »
(19/10/2026, soir)

## Ce que j'ai vérifié (19/10, banc d'essai local + trois audits en lecture seule)
Banc : le VRAI moteur d'envoi compilé tel quel, face à un faux serveur qui applique les mêmes
règles pures (`lireDeclaration`, `planDeclaration`, `placeRestante`), dans Chrome headless en
iPhone, avec le réseau bridé (4G faible : 150 ms, 2 Mbit/s montants) et coupé. Aucune écriture
en production (le garde-fou a refusé la création d'une édition d'essai réelle).
- **iPhone, re-choisir des photos déjà envoyées les renvoyait en double** : la clé de reprise
  contient la date du fichier, et sur iPhone c'est l'heure du choix. Mesuré : 10 photos
  re-choisies = 20 en base.
- **Une vignette perdue pendant une coupure n'était jamais renvoyée** : 4 photos sur 24 sans
  vignette après une coupure d'une minute (c'est T-171 : 28 photos sur 879 en base).
- **À la clôture, les photos déjà au coffre étaient dites refusées** et restaient invisibles
  (audit, simulé : 2 objets au coffre sans confirmation sur 30 photos).
- **Un réseau qui clignote faisait passer des photos en erreur** sans reprise automatique ; un
  lien supprimé faisait tourner l'envoi à l'infini en « connexion interrompue » ; une requête
  sans réponse gelait l'envoi sans rien dire ; « Merci » s'affichait malgré des erreurs.
- **500 photos choisies au-delà du plafond faisaient 480 déclarations au serveur** (une par
  photo), et la confirmation partait photo par photo en 4G faible (22 pour 24).
- **Le nom** : facultatif, libre, modifiable à chaque visite ; « Léa », « Lea » et « Léa
  Martin » font trois personnes chez le responsable.
- **Au-delà de 1 000 photos**, voir T-167 et T-168.

## Ce que je propose
Branche `feat/collectif-collecte-solide` :
1. Moteur (`edition/_composants/depot/moteur.ts`) : une coupure ne compte plus comme essai,
   reprise à l'événement `online`, garde-temps sur chaque requête, vignette renvoyée, clôture
   qui confirme ce qui est au coffre, 404 qui ferme avec une phrase vraie, lots plus pleins,
   plus de déclaration quand il n'y a plus de place, confirmations groupées sur 15 s, écran
   gardé allumé pendant l'envoi (Screen Wake Lock), clé de fichier sans date fraîche et avec le
   sel de l'appareil (`cleDepot.ts`).
2. Nom : prénom ET nom exigés la première fois, puis figé (« Tu envoies en tant que … ») ; le
   serveur reprend le nom déjà donné par l'appareil (`participant.ts`, `participantConnu.ts`).
3. Style : `COLLECTIF_STYLES` fermé par défaut, la page Style devient une vitrine de nos
   magazines (images déjà publiques), le brief refuse tout geste (409 `styles_fermes`).
4. T-167 / T-168 dans la même branche.

## Ce qui a été fait
Branche `feat/collectif-collecte-solide` (19/10 au soir), types, lint, build, deux harnais verts.

**Banc, avant → après** (mêmes scénarios) : re-choix iPhone 20 photos en base → 10 ; wifi qui
bloque le coffre 90 s : 20 erreurs → 20 arrivées sans clic ; clôture pendant l'envoi : 1 photo
au coffre invisible → 0, 3 arrivées → 10 ; vignettes perdues après coupures (4/24, 4/12, 24/24)
→ aucune ; 500 photos au-delà du plafond : 480 déclarations → 53.

**Essai RÉEL en production** (accord de Mathias, 19/10 au soir) : édition « Essai Claude »
(`56c31f25…`), servie par la nouvelle version en local, base et coffre de production.
- iPhone émulé, 4G faible, 24 photos de 2 à 3 Mo, coupure d'une minute : 24/24 arrivées,
  « Merci Camille », 0 sans vignette, nom et accord enregistrés sur chaque photo.
- Retour sur le lien : « Tu envoies en tant que Camille Essai · 24 photos déjà reçues » ; les
  10 mêmes photos re-choisies (date iOS fraîche) : 0 doublon (24 en base).
- Lien « sans limite » créé par la responsable, Android émulé, 300 photos d'un coup : 68 s,
  0 échec, 16 déclarations. Total 324/324 confirmées, 2 personnes, 0 doublon, page Photos de la
  responsable correcte.
- Édition ARCHIVÉE ensuite (lien participants : 404). Rien d'effacé.

Reste : un vrai iPhone et un vrai Samsung (T-155), l'écran verrouillé en plein envoi.
