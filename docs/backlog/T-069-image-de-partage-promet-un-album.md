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
