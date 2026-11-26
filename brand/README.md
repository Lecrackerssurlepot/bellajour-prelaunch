# Bellajour : la marque

Tout ce qui fait l'image de Bellajour vit dans ce dossier. **Une information, un seul endroit.**
Le résumé lisible par toute l'équipe est dans le Notion, espace « Marque Bellajour » ; ce dossier
reste la source : s'ils divergent, ce dossier a raison.

## Où trouver quoi

| Je cherche | C'est ici |
|---|---|
| Les règles (couleurs, polices, logo, ton, composants…) | [`charte/README.md`](charte/README.md), puis les fiches A à O |
| Une valeur exacte (une couleur, une taille, une durée) | [`tokens.json`](tokens.json), la seule source ; `build/` en est généré |
| La référence visuelle du site | [`reference/`](reference/README.md) (le duplicata « Essai photos ») |
| Le logo | [`assets/logo/bellajour.svg`](assets/logo/) (vectoriel) ; la source Procreate à côté |
| Le magazine en 3D, ses images et vidéos | [`assets/3d/magazine/`](assets/3d/magazine/README.md) |
| Les visuels du site à fournir, et comment les poser | [`VISUELS-A-FOURNIR.md`](VISUELS-A-FOURNIR.md) |
| Les gabarits de mail, de brochure, de post | fiche [`charte/N-declinaisons.md`](charte/N-declinaisons.md) ; les mails : `scripts/mails-charte.mjs` |
| La charte en images (pour Louis) | la page `/brand` du site (protégée par l'accès admin) |
| Où en est le chantier | [`ETAPES-NOTION.md`](ETAPES-NOTION.md) (court) et [`PROJECT-STATE.md`](PROJECT-STATE.md) (détaillé) |
| Les vérifications passées | [`reports/`](reports/) |

## Les outils

| Commande | Ce qu'elle fait |
|---|---|
| `node brand/scripts/build-tokens.mjs` | Régénère `build/` (CSS, TS, mail) depuis `tokens.json` |
| `node brand/scripts/contrastes.mjs` | Vérifie que chaque paire texte/fond passe AA |
| `node brand/scripts/controle-charte.mjs` | Refuse toute couleur ou taille écrite en dur dans `src/` |
| `node brand/assets/3d/magazine/exporter.mjs <couverture>` | Sort les images et la vidéo d'un magazine |
| `node brand/scripts/logo-mail.mjs` | Tire les PNG du logo pour les mails |

## Les règles du dossier

- **Qui décide** : Mathias valide, avec Louis pour le visuel. Claude propose et applique (fiche O).
- **Modifier** : une valeur dans `tokens.json`, jamais dans un CSS ou un mail ; puis les deux
  premières commandes ; puis la fiche et le journal de la fiche O.
- **Ce qui n'est plus valable** n'est pas ici : l'ancienne charte est rangée dans `archive/`.
