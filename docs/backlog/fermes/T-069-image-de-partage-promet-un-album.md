---
id: T-069
titre: L'image de partage promet un album, et peut casser le déploiement entier
domaine: front
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de référencement du 29/08/2026.
## Ce que j'ai vérifié
Deux défauts distincts dans le même fichier, `src/app/opengraph-image.tsx`.
**1. Elle dit autre chose que ce qu'on vend.** L'unique image de partage du site (`:8,111-122`)
est celle de l'ancienne landing crème et annonce « Nous composons vos photos en albums
d'exception ». Le site vend un **magazine** depuis le 24/08, et les deux pages déclarent un `alt`
qui parle de magazine (`page.tsx:60`, `magazine/page.tsx:73`). Un lien collé en message privé ou
en story Instagram — le premier canal d'acquisition — promet un album, ne montre ni prix ni
produit, et ouvre autre chose.
À noter : `ambassadeurs/page.tsx:20-34` déclare un bloc `openGraph` **sans `images`**, et Next
remplace l'objet entier au lieu de le fusionner : cette page perd l'image et annonce quand même
`summary_large_image`. Un partage montre un rectangle vide.
**2. Elle peut faire échouer un déploiement.** Elle va chercher deux polices sur
`fonts.googleapis.com` et lit `public/images/header-bellajour.webp` et `public/images/ui/logo.webp`
via sharp, **avec un `throw` sur chaque échec** (`:15,17`).
⚠️ **Conséquence directe sur T-003** : `header-bellajour.webp` n'est référencée QUE par ce fichier
et `(atelier)/page.tsx`. Un ménage des assets orphelins qui la déplacerait ferait échouer le build
entier — y compris celui qui porterait un correctif urgent sur la vente. Avertissement ajouté à T-003.
## Ce que je propose
Refaire l'image de partage aux couleurs et au vocabulaire actuels. C'est un visuel de marque :
**c'est ta décision, pas la mienne.** Je peux préparer la version technique dès que la formulation
est arrêtée.
Indépendamment, et sans attendre : remplacer les `throw` par un repli (l'image se fabrique sans le
décor plutôt que de faire tomber le déploiement), et rendre son image à `/ambassadeurs`.
**Question pour Mathias** : quelle phrase veux-tu sur l'image de partage ?
## Ce qui a été fait
—

## 01/09 — Mathias : ça viendra avec le chantier visuels
« Il faut effectivement changer cela. Ça viendra quand on s'occupera des visuels. » Le ticket
reste ouvert et continue de bloquer le nettoyage des 101 Mo d'images orphelines (T-003) :
le `throw` de opengraph-image.tsx sur fichier manquant casse le build si on déplace avant.


## 15/09/2026 — FERMÉ, les trois points

**1. Elle disait autre chose que ce qu'on vend — réglé.** L'image n'est plus fabriquée : c'est un
fichier livré par Mathias, `public/images/v2/partage/bellajour-magazines-1200.png`, une
photographie des **dix magazines imprimés**. Plus de phrase du tout sur l'image, donc plus de
promesse d'album ; les réseaux affichent le titre et la description à côté. Déclarée en URL
**absolue** dans `layout.tsx`, `(atelier)/page.tsx` et `magazine/page.tsx` — les robots d'aperçu
ne résolvent pas les chemins relatifs. Vérifié en production : `og:image` et `twitter:image`
pointent le fichier sur les deux pages, et le fichier répond 200.

**2. Elle pouvait faire échouer un déploiement — réglé à la racine.** `src/app/opengraph-image.tsx`
est archivé dans `archive/opengraph-genere/` avec son README. Plus aucune police n'est téléchargée
chez Google pendant la construction, plus aucun fichier de `public/` n'est lu par sharp au build.
`header-bellajour.webp`, dont elle était le dernier lecteur, rejoint `archive/images-v1/divers/`.
**Playfair Display n'est plus chargée nulle part** — `src/app/CLAUDE.md` l'affirmait encore, la
fiche est corrigée.

**3. « Rendre son image à `/ambassadeurs` » — sans objet.** La page répond **410** : elle
n'existe plus. Vérifié le 15/09.

### Ce qui reste, et qui n'appartient pas à ce ticket

Les **pages légales** n'ont toujours aucune vignette : elles déclarent leur propre bloc
`openGraph` sans `images`, et Next remplace l'objet au lieu de le fusionner (piège D6). Ce n'était
pas le cas avant non plus — vérifié en production avant la bascule. Personne ne partage des CGV.
**BJ-P02**, une vignette propre à `/magazine`, n'est pas livrée : les deux pages partagent la même
image et donc le même message.
