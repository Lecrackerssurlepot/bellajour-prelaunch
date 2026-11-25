# Chantier charte V2 : état

À relire au début de chaque séance. Le plan complet, en 7 phases et avec leurs gates, est dans
`/Users/mathiasdurand/.claude/plans/piped-tickling-melody.md`, résumé ci-dessous.

- **Branche** : `refonte-charte-v2`, partie de `main` (577736f1).
- **Copie de travail** : `/Users/mathiasdurand/bellajour-charte-v2`. Le dossier principal garde des fichiers Noël non versionnés qui diffèrent de `main`.
- **Règle** : on ne passe à la phase suivante qu'avec la gate verte ET « OK phase N » de Mathias.

## Phase 1 : la charte écrite (FAITE, gate fermée le 25/11/2026)

### Fait

**Les jetons et leurs scripts**
- `brand/tokens.json` : 174 jetons DTCG, dont 12 surcharges téléphone. Source : le banc RKkzi v7 « Blanc pur · Fraunces » et les variations du catalogue DEZh.
- `brand/scripts/build-tokens.mjs` génère `brand/build/tokens.css` (`--m-…`), `tokens.ts` et `mail.json`.
- `brand/scripts/contrastes.mjs` : 19 paires, toutes AA.

**Les fiches**
- `brand/charte/README.md` et les fiches A à O.

**Les pointeurs vers la nouvelle charte**
- `CLAUDE.md` à la racine : une section « Charte » qui pointe vers `brand/charte/README.md`.
- `docs/marque/CHARTE-GRAPHIQUE.md`, `MOTION.md` et `A-TRANCHER.md` : un bandeau « Remplacé ». `TON.md`, `STRUCTURE-INFO.md` et `PIEGES-VISUELS.md` restent valables.
- `.claude/skills/bellajour-brand-motion` : bandeau « PÉRIMÉ ».

**Vérifications** : `tsc` 0, lint 0 erreur (25 avertissements, tous antérieurs), build OK.

### Décisions tranchées par Mathias le 25/11

| Sujet | Décision |
|---|---|
| Accent | L'encre noire `#111111`. Aucun bleu. |
| Mode | Un seul mode. Les blocs nuit restent en accent ponctuel. |
| Étiquettes | Inter Tight. IBM Plex Mono sort de la charte. |
| États | Proposés par Claude, à valider en phase 2. |
| Police | Facile à changer, par rôle, voir D. |
| Variations du catalogue | Disponibles, désactivées par défaut, jamais dans les mails pour l'instant. |
| Icônes | Lucide, et des visuels datés dans `media.ts`. |
| Magazine 3D | Classique, construit une fois sous tous les angles, par un agent Fable 5.2. |
| Périmètre de la phase 4 | Ce que voit le client. L'admin et l'éditeur viendront plus tard. |
| Brochures | PDF numériques, en RVB. |

### Décisions prises par Claude (à contester si besoin)

- Deux points de rupture seulement : 700 et 901 px.
- Cinq rayons et trois ombres.
- Les tailles hors échelle deviennent des exceptions nommées.
- Le bord de champ passe de 18 % à 48 % pour atteindre 3:1.
- Les apparitions et les boucles se coupent avec « moins d'animations » ; le livre et la pile restent.
- L'ancien `MOTION.md` disait « tout se coupe ». **Conflit signalé.**

### Gate 1 : fermée le 25/11 par Mathias (« Okay pour l'instant »)

1. **Logo** : pas de SVG (dessiné dans Procreate). Mathias fournit un PNG transparent haute définition, vectorisé en phase 2 (fiche B).
2. **Valeurs « proposé »** : acceptées pour l'instant, validées à l'œil en phase 2 sur `/brand`.
3. **Format des brochures** : à choisir en phase 2 (fiche N).
4. **URL de la page Groupes** : à trancher en phase 4 (fiche L).

### Écarts découverts à l'étape 0

- L'inventaire avait été fait sur la copie locale, plus ancienne que `main`. Sur `main` existent aussi :
  - les pages `/offrir`, `/offrir/merci`, `/carte/<token>`, `/partenaires` et `/noel-preview` ;
  - `docs/marque/` ;
  - les logos `public/images/v2/ui/logo-bellajour-*.webp`.
- La liste de nettoyage de la phase 7 sera refaite sur `main` avant d'être montrée.

## Phase 2 : la vitrine `/brand` (en cours, 25/11/2026)

### Fait
- `src/app/brand/` : `page.tsx` (lit `brand/build/tokens.ts`, aucune valeur recopiée), `Motion.tsx` (démo des courbes, sur geste), `brand.css` (que des `var(--m-…)`), `layout.tsx` (`noindex`).
- Les classes `.m-*` de `brand.css` sont les composants de la charte : la phase 4 les reprendra.
- `src/app/polices.ts` : les quatre polices en un seul endroit, une variable par rôle (`--police-titre`…). Interlope copiée dans `src/app/polices/` avec sa licence OFL.
- `build-tokens.mjs` : chaque famille de rôle passe par `var(--police-<rôle>, "Nom")`, le relais vers next/font.
- `middleware.ts` : `/brand` exige le cookie admin.
- Preuve sur une vraie construction (`next start`) : sans cookie, 307 vers `/admin/login` ; avec, 200 et `noindex, nofollow, nocache`.
- Vérifié à l'écran sur ordinateur et téléphone (375 px), sans débordement horizontal.

### Constat en passant
- En `next dev` local, le middleware ne bloque rien, `/admin` compris. La production redirige bien (307 vérifié). Ne pas tester une protection en mode dev.

### Retours de Mathias (25/11), appliqués
- Logo vectoriel tracé depuis son PNG blanc (fiche B). La version bleue n'est pas nécessaire.
- Signatures en fond et en pied : faites avec le logo, serrées et répétées. Le canson est retiré. Les points fins restent, sans usage prévu.
- Réseaux : formats habituels, gabarits à voir avec Louis. Priorité : la typo se lit sur n'importe quelle photo (fiche N).
- Mails : trop sobres. En phase 6 : magazines empilés pour la couleur, gros textes, jeu de graisses, côté atelier (fiche N).

### Reste pour fermer la gate 2
1. Le choix du format de brochure (A4 portrait ou 16:9).
2. La validation à l'œil de Mathias et Louis, ordinateur et iPhone, sur la préversion Vercel.

## Phases suivantes

| Phase | Contenu | État |
|---|---|---|
| 2 | Vitrine `/brand`, protégée, générée depuis `tokens.ts`, plus logo vectorisé et format des brochures | en cours (voir ci-dessus) |
| 3 | Magazine 3D (`brand/assets/3d/magazine/`) | à faire |
| 4 | Refonte des pages client, une page par commit | à faire |
| 5 | Vérification par agents (Playwright, Lighthouse, axe) | à faire |
| 6 | Mails depuis `mail.json` | à faire |
| 7 | Nettoyage vers `archive/ancienne-charte/`, Notion, liste claude.ai | à faire |
