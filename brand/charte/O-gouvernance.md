# O. Gouvernance

## Version

- **Version actuelle** : 2.0.0 (25/11/2026), dans `tokens.json` → `$extensions.bellajour.version`.
- **Numérotation** :
  - **2.0.x** : une valeur ajustée (une nuance, une taille) ;
  - **2.x.0** : un jeton ou un composant ajouté ;
  - **3.0.0** : un changement d'identité (une police, la couleur d'accent).
- **Chaque version** est notée dans le journal en bas de cette fiche.

## Qui valide

- **Mathias** valide toute valeur, avec Louis pour les choix visuels. Il le fait sur `/brand` (phase 2), sur ordinateur et sur iPhone.
- **Claude** propose, mesure et applique. Il ne change jamais une valeur acquise sans accord.

## Comment modifier

1. On change **une seule** valeur dans `brand/tokens.json` (jamais dans un CSS, un mail ou une page).
2. On lance `node brand/scripts/build-tokens.mjs`, puis `node brand/scripts/contrastes.mjs`.
3. On met à jour la fiche concernée si la règle change, et on note la version ci-dessous.
4. Contrôle :
   - `brand/scripts/controle-charte.mjs` (phase 4) refuse toute couleur ou taille écrite en dur dans `src/` ;
   - `/brand` montre le résultat.

## Ce que la charte remplace

| Remplacé | Par |
|---|---|
| `src/app/tokens.css` (crème `--bj-*`) | `brand/build/tokens.css` |
| `src/app/(atelier)/theme.css` (atelier `--c-*`) | idem |
| La Porcelaine et le Charbon | idem |
| Le skill `bellajour-brand-motion` | `brand/charte/` |
| Les palettes en dur des mails | `brand/build/mail.json` |
| Les sections de couleurs et de polices de `src/app/CLAUDE.md` | `brand/charte/` |

**Calendrier** : tant que la phase 4 n'a pas migré une zone, son ancien fichier reste en place.
Il est rangé dans `archive/ancienne-charte/` en phase 7, jamais supprimé.

## Journal

| Version | Date | Changement |
|---|---|---|
| 2.0.0 | 25/11/2026 | Première charte écrite, depuis le banc RKkzi v7 « Blanc pur · Fraunces » et les variations du catalogue DEZh. Accent encre, un seul mode, étiquettes en Inter Tight, deux points de rupture, cinq rayons, trois ombres, bord de champ relevé à 3:1. |
