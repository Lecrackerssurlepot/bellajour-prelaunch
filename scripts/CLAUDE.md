# Scripts — lequel est inoffensif, lequel touche la production

Chargé dès qu'on touche un script. Aucun n'est branché dans `package.json` : tous se lancent
à la main. Lire cette table AVANT d'en lancer un.

## Sans danger — lecture seule ou local

| Script | Commande | Ce qu'il fait |
|---|---|---|
| `verif-atelier.ts` | `npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts` | **Le seul harnais de test du dépôt.** Sans base ni réseau : transitions, urgence, mails, lot |
| `verif-mails-brevo.ts` | `npx tsx --tsconfig tsconfig.json scripts/verif-mails-brevo.ts` | Compare les `{{ params.X }}` des templates Brevo aux paramètres réellement envoyés |
| `cloudprinter-produits.mjs` | `node scripts/cloudprinter-produits.mjs produit …` | Lit le catalogue. ⚠️ API très rationnée |
| `optimize-images*.mjs`, `images-univers.mjs` | `node scripts/…` | Optimisation sharp d'assets locaux |

## À manier avec précaution — écrit chez un tiers ou en base

| Script | Danger |
|---|---|
| `mails-atelier.mjs --pousser` | **Réécrit les DIX templates dans Brevo.** Bon quand on retouche la maquette commune, mauvais quand on n'ajoute qu'un mail. Borner : `--pousser --seulement M0` |
| `recette.mjs` | **Agit sur la base de PRODUCTION.** Vieillit des dossiers pour déclencher M2/M3b/M8. `nettoyer` ne touche que les titres commençant par « test », et exige `--vraiment` |
| `vignettes-rattrapage.ts` | Télécharge des originaux depuis R2 et écrit en base. Idempotent, `--essai` pour compter sans écrire |

**Le texte des mails vit dans `mails-atelier.mjs`, versionné — pas dans l'interface Brevo.**
Modifier un mail = modifier ce fichier, puis pousser le seul template concerné.

Aucun de ces scripts ne se lance sans l'accord de Mathias dès qu'il écrit quelque part.
