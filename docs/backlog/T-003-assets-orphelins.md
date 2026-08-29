---
id: T-003
titre: 101 Mo d'images orphelines déployées à chaque build
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`public/` pèse 123 Mo, dont ~101 Mo dans des dossiers que **plus aucun fichier de `src/` ne
référence** : `public/images/prevente/` (78 Mo, dont quatre `.mov` de 11 à 22 Mo),
`public/images/Préventes-Section-2/` (23 Mo), `lancement/avis/Margaux.png` (7,4 Mo),
`Aude.jpg` (3,1 Mo), `solution/` (2,2 Mo). Restes de l'archivage de la prévente (D13) : le code
est parti dans `archive/`, les assets sont restés.
Effet : chaque déploiement Vercel transporte et stocke 101 Mo inutiles. Ce n'est pas servi à la
visiteuse (rien ne les demande), donc ce n'est pas un problème de vitesse de page — c'est du
poids de build et de dépôt.
⚠️ `public/images/lancement/galerie/` est VIVANT (`Univers.tsx:505`, `Corps.tsx:109`) : ne pas
emporter tout `lancement/`.
⚠️ **PIÈGE DÉCOUVERT LE 29/08, à lire avant tout déplacement.**
`src/app/opengraph-image.tsx:34-35` lit `public/images/ui/logo.webp` ET
`public/images/header-bellajour.webp` via sharp, **avec un `throw` en cas d'échec**.
`header-bellajour.webp` n'est référencée QUE par ce fichier et `(atelier)/page.tsx` : elle a donc
tout d'une orpheline, et la déplacer **ferait échouer le build entier** — y compris celui qui
porterait un correctif urgent sur la vente. Voir T-069, qui propose de remplacer ces `throw` par
un repli. **Traiter T-069 AVANT ce ticket.**

## Ce que je propose
Déplacer les dossiers orphelins vers `archive/assets/` avec un README, après un grep de
confirmation fichier par fichier. Jamais de suppression.
## Ce qui a été fait
—
