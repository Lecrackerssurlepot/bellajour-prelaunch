# Charte graphique Bellajour

> **Remplacé le 25/11/2026 par la charte V2 : [`brand/charte/README.md`](../../brand/charte/README.md).** Ce fichier décrit l'ancienne charte ; il reste lisible jusqu'au nettoyage (phase 7), mais n'est plus à suivre.


> « Vivez. Nous composons. »

Maison d'édition du souvenir : le client dépose ses photos et son histoire, l'atelier compose un magazine, on imprime, on livre. **Premium, jamais solennel** : un artisan qui travaille dans l'ombre pendant que l'on vit, pas une application qui réclame de l'attention.

Ce fichier est la version texte, dans le dépôt, de l'artefact « Charte Bellajour » (Design System `EpskP7BeDRPDtCQV9fj3Aj`, écrit le 09/11/2026 depuis le code de `main`). Chaque valeur vient du code ; ce qui est flou ou contradictoire est rangé dans `A-TRANCHER.md`, jamais résolu ici. Mis à jour le 16/11/2026 (section « Ajouts du 16/11 »).

## Comment s'en servir

1. Toute maquette, page, artefact ou agent lit ce fichier avant de choisir une couleur, une police ou un rayon.
2. Un écran se range dans **un monde** (ci-dessous) et n'emprunte rien aux autres. Mélanger deux palettes est le défaut nº1 relevé le 09/11 : « d'une maquette à l'autre, les visuels diffèrent ».
3. Une valeur absente d'ici n'existe pas : on la demande à Mathias. Une valeur citée par un vieux document mais absente d'ici est un fossile (`PIEGES-VISUELS.md`).
4. Quand le code change, ce fichier change dans le même geste. Il décrit le code, il ne le précède pas.
5. Un écran se compare **point par point** à la maquette validée : place, présence, texte, lumière, pas seulement les couleurs (15/10).

## Les quatre mondes

Le code porte quatre palettes, scopées chacune par un conteneur racine. Le thème se fait **par scope de layout**, jamais par `data-theme` global sur le site (ce mécanisme est mort ; seul l'espace client des éditions porte un `data-ec-mode`).

| Monde | Où | Conteneur | Feuille source | Quand l'employer |
| --- | --- | --- | --- | --- |
| **Porcelaine** (jour) | tout `/admin/**` ; l'espace client des éditions `/edition/<token>` en mode jour | `.adm-root` ; `.bj-atelier.ec-espace[data-ec-mode="jour"]` | `src/app/admin/admin.css` (redéfinit les `--bj-*` crème), `src/app/edition/[token]/espace.css` | Tout nouvel écran de l'admin ou de l'espace client, le jour. Validé le 15/10/2026 : « le beige fait vieillot ». |
| **Charbon** (nuit) | l'espace client des éditions, mode par défaut | `.bj-atelier.ec-espace` | `espace.css` | La nuit de l'espace client. Plus de noir pur : un charbon, un blanc cassé, des gris qu'on lit (texte 15,2 : 1, texte doux 7,9 : 1, légendes 5,5 : 1). |
| **Sombre** (`.bj-atelier`) | les pages publiques `/`, `/magazine`, `/composer`, `/numero/<token>` | `.bj-atelier` | `src/app/(atelier)/theme.css` | Les pages que voit le grand public. **Pas reprises en Porcelaine / Charbon** : demander à Mathias avant d'y toucher, maquettes d'abord (sa règle). |
| **Crème** | `/merci`, `/ambassadeurs/*`, les pages légales, `/inviter` | `:root` (+ `.bj-creme-fonts` pour la police display) | `src/app/tokens.css`, `src/app/globals.css` | Les pages héritées de la prévente que quatorze fondateurs consultent encore. On n'y crée rien de neuf. |

**Porcelaine et Charbon sont les deux faces d'une même direction** (15/10/2026, maquette « Bellajour · direction visuelle ») : verre, arrondis emboîtés, éléments qui flottent, plus d'angles droits ni de sections séparées par des traits. Un bloc est un panneau de verre, jamais une zone bordée d'un filet. Le menu et les barres se détachent des bords. Les ombres sont longues et douces, avec un reflet clair en haut du verre la nuit.

### Les couleurs qui font Bellajour

- **Le bleu Bellajour `#4a90d9`** : l'action en crème et en Porcelaine, et sur les pages publiques le SEUL bouton de paiement (`--c-order`). Il ne sert à rien d'autre là-bas.
- **La terracotta chaude `#d68a63`** : l'accent des pages publiques (moments forts, états actifs). Sa sœur de nuit dans l'espace client est le **cuivre `#e3a27f`**.
- **L'encre bleutée `#101828`** de la Porcelaine, le **blanc cassé `#ecedf0`** du Charbon, la **crème `#f5f0e7`** du texte sombre et le **charbon `#1c1c1c`** du monde crème : quatre encres, une par monde.
- Les **marques du tri** de l'atelier (voir le composant Marques du tri) : ✦ doré `#c8962e`, ★ bleu Bellajour, ◐ ardoise `#5b6573`, ✕ brique `#b4532a`, le cœur du client rouge `#e0445a`.

Les valeurs exactes, par thème et avec leur jeton source, sont dans l'artefact « Charte Bellajour » (section Colors). Une valeur affichée sous un thème alors que sa note dit « pas de jeton dans ce monde » est un héritage d'affichage du premier thème : la note fait foi.

## Typographie

Deux familles, et deux seulement, chargées par `next/font/google` (self-hébergées, aucun `<link>` dans le `<head>`) :

- **Cormorant Garamond**, la display. C'est bien la Garamond, pas « Cormorant ». En graisse **400** droite sur les pages publiques et l'espace client (`(atelier)/layout.tsx`, `numero/layout.tsx`, 400 normal + italique) ; en **500 / 600** italique dans le monde crème et l'admin (`creme-fonts.ts`, `globals.css` : `h1..h3` à 600, `h1` italique). Les titres de l'admin sont en bleu Bellajour.
- **DM Sans**, l'interface et le corps. Variable (axe optique 9..40) sous `.bj-atelier`, 300 pour le texte éditorial, 400 pour les champs et libellés, 500 pour les CTA ; 400 / 500 / 600 / 700 figées dans le layout racine. Son italique n'est chargée que pour l'exemple de l'écran 2 de `/composer`.

**Playfair Display n'est plus chargée nulle part** depuis le 15/09/2026. Le skill `bellajour-brand-motion` la cite encore : c'est un fossile (voir `A-TRANCHER.md`).

Règles : les grands titres des pages publiques sont droits (l'italique globale de `globals.css` y est annulée) ; les **données de l'admin sont toujours en DM Sans** (zéro serif sur un chiffre ou une cellule, `tabular-nums`) ; un seul grand titre de 34 px par écran au téléphone dans l'espace client ; les champs font 16 px au doigt (iOS zoome en dessous). L'échelle est dans l'artefact (section Typography).

## Espacements, rayons, ombres, verre

- **Espacements** : l'échelle de 8 sur base 4 (`--bj-sp-1..8`, 4 → 64 px) dans l'admin et le monde crème. Le monde sombre a trois écarts fluides et un seul endroit pour les régler : étiquette → titre, titre → sous-titre, sous-titre → corps (`--esp-etiq`, `--esp-sous`, `--esp-corps`). La cible au doigt est 44 px, jamais 28 ni 34.
- **Rayons** : jamais de coin vif. Deux générations cohabitent : 12 / 16 / 20 et bouton 14 en crème ; **28 › 24 › 16 › 14 emboîtés et boutons en pilule** en Porcelaine / Charbon (maquette du 15/10 : « panneaux 28 px, cartes 24, champs 14, boutons en pilule »).
- **Ombres** : elles existent (la vieille consigne « zéro ombre » ne vaut plus), longues et douces, **posées, jamais animées** : on anime l'opacité d'un pseudo-élément qui porte l'ombre. Sur fond sombre, préférer un voile.
- **Verre** : fond translucide + `backdrop-filter` + bord clair + reflet. Le flou de carte est `blur(24px) saturate(1.4)` en Porcelaine / Charbon, 20 px sur les barres des pages publiques, 18 px en crème. **Un verre sur un élément `position: fixed` rame sur Chrome/Android** : les barres ont un repli quasi opaque sans flou (`useAndroid()` + `.pv-nav--flat`).

## Motion

Lent et délibéré, jamais pressé, toujours intentionnel. La durée de base est **240 ms** avec la courbe `cubic-bezier(0.4, 0, 0.2, 1)` ; le récit des pages publiques prend 700, 800, 1200 et 1700 ms avec des courbes qui n'ont jamais de départ lent. La révélation au défilement est un `translateY(24px)` + opacité, une seule fois, par `requestAnimationFrame` et `IntersectionObserver`, sans librairie. On n'anime que `opacity` et `transform`, jamais `width`, `height`, `padding` ni `box-shadow`. `prefers-reduced-motion` coupe tout. Le détail, et l'écart entre le skill et le code, est dans `MOTION.md`.

## Copie

Le ton, les mots et les règles d'écriture sont dans `TON.md`. La façon de poser une information (récapitulatif, montants, dates) est dans `STRUCTURE-INFO.md`.

## Iconographie et images

Pas d'emoji dans l'interface. Les icônes sont des SVG en ligne, trait fin, à la couleur du texte. Les quatre marques du tri sont des glyphes nommés (✦ ★ ◐ ✕). Les images sont des `<img>` bruts, jamais `next/image`. Grain et fibre du papier sont des turbulences SVG en ligne, pas des fichiers. La couverture d'un magazine est **toujours une vraie photo** (tranché le 09/11/2026) : plus de couverture peinte ni d'illustration générée. Les photos du client restent sélectionnables et enregistrables ; seules les images de mise en scène des pages publiques sont figées au doigt.

## Ce qui n'existe pas (ne pas ressusciter)

`--cream`, `--dark`, `--ink`, `--muted`, `--steel`, `--steel-glass`, `--border` : zéro définition, zéro usage, ils venaient de la landing waitlist archivée. `--bj-nav-h` : référencé, défini nulle part, et **le définir ferait descendre tous les `<main>` du site**. `--bj-beige #EAE3D8`, `--bj-accent #778899`, `--bj-noir`, `--bj-creme #F0EBE1` : les jetons du skill motion, absents du code. Playfair Display. Les angles droits. `100dvh` et `100vh`. Tailwind (installé, aucune directive importée, il ne produit rien). Les CSS Modules.

## Ajouts du 16/11 (Noël)

- **Le logo existe** : `public/images/v2/ui/signature-bellajour-240.webp` (la signature, blanche, sur fond sombre) et `logo-bellajour-240.webp` / `-640.webp`. La carte cadeau, `/offrir`, `/offrir/merci`, `/carte/<token>`, `/numero` et `/composer` portent le logo ou la signature en `<img>` brut. Ne plus écrire « Bellajour » en texte à la place du logo.
- **La carte cadeau** (`noel-preview/CarteCadeau.tsx`, `noel.css`) : dégradé sombre fixe `--grad-cover`, signature en tête, dédicace « Pour Vanessa » en petites capitales accent AU-DESSUS de la phrase, la phrase en display, le mot du donateur en italique display entre guillemets dessous (deux lignes au plus), montant et validité en bas. Les tailles sont en `cqw` (requêtes de conteneur) : la carte garde ses proportions à toute largeur.
- **Les montants** se lisent en ligne de récapitulatif, jamais dans une phrase (`STRUCTURE-INFO.md`).
