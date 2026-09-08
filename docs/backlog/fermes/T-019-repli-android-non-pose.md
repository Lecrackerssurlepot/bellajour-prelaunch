---
id: T-019
titre: La barre de l'accueil n'a pas son repli Android
domaine: front
gravite: confort
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Décision D5 du 27/08/2026 : risque accepté en connaissance de cause, faute d'appareil Android.
## Ce que j'ai vérifié
`.at-nav` reste en `backdrop-filter: blur(20px)` sur un `position: fixed` — exactement la
construction diagnostiquée comme « jank garanti » sur Chrome/Android en juin (commit 246d8e5),
avec un flou plus lourd de 2 px.
Le correctif est écrit d'avance et posé à trois endroits : `.pv-nav--flat` + `--bj-nav-android-bg`
+ `useAndroid()` (`src/hooks/useClient.ts`). Desktop et Safari iOS restent pixel-identiques.
## Ce que je propose
Poser le repli. Il est sans risque sur les autres plateformes et déjà éprouvé.
**Question pour Mathias** : la décision D5 disait « à poser dès qu'un Android passe à portée ».
On peut aussi le poser à l'aveugle — le patron est identique à celui qui tourne déjà ailleurs.
Tu préfères qu'on attende un test réel, ou qu'on pose ? Lié à T-020 : sans mesure, on ne saura
jamais qu'une visiteuse décroche.
## Ce qui a été fait
—

## Posé le 08/09/2026

Le constat du 29/08 tenait encore, les quatre affirmations vérifiées une à une avant d'écrire :
`.at-nav` était toujours en `position: fixed` + `backdrop-filter: blur(var(--glass-blur))
saturate(1.1)` avec `--glass-blur: 20px` ; `.pv-nav--flat` existait
(`src/app/components/navbar.css:62`), `--bj-nav-android-bg` aussi (`tokens.css:48`), et
`useAndroid()` (`src/hooks/useClient.ts:116`).

**Mais le correctif « écrit d'avance » ne se recopiait pas tel quel, et c'est le point à
retenir.** `.pv-nav--flat` et `--bj-nav-android-bg` appartiennent au monde **crème**
(`--bj-*`) ; `.at-nav` vit dans le monde **sombre** (`.bj-atelier`, `--c-*`). Réutiliser
littéralement le token crème aurait mélangé les deux palettes. Le *patron* est donc repris à
l'identique (la classe posée par `useAndroid()`, le flou remplacé par un fond quasi opaque)
avec un token sombre à lui : **`--c-nav-android-bg: rgba(10, 10, 12, 0.96)`**, scopé
`.bj-atelier` comme le reste de `theme.css`.

**Un piège de cascade attrapé en chemin** : `.at-nav.pv-nav--flat` et `.at-nav.is-stuck` ont la
même spécificité (0,2,0). Placée avant, la règle Android perdait la main sur le fond dès que la
barre était défilée. Elle est donc posée **après** `.is-stuck`. Détecté à la mesure, pas
supposé.

**Mesuré au navigateur, avant ET après, sur le même serveur :**

| contexte | `backdrop-filter` | `background` |
|---|---|---|
| Mac, `/` et `/magazine`, **avant** | `blur(20px) saturate(1.1)` | `rgba(16, 16, 18, 0.72)` |
| Mac, `/` et `/magazine`, **après** | `blur(20px) saturate(1.1)` | `rgba(16, 16, 18, 0.72)` |
| Android (Pixel 8), **après** | `none` | `rgba(10, 10, 12, 0.96)` |

**Identique au bit près hors Android**, avec et sans `.is-stuck`. C'était le critère numéro un.

`tsc`, `lint`, `build` (59 pages) verts. `src/app/CLAUDE.md` corrigé : son piège nº 3 disait
encore que le repli n'était pas posé.

## Ce qui n'est pas prouvé

La détection reste un test d'user-agent (`/Android/i`) — le mécanisme exact déjà en production
sur `.pv-nav--flat` ailleurs, donc éprouvé, mais **jamais revérifié sur un vrai téléphone
Android**. C'est la limite que la décision D5 avait acceptée en connaissance de cause ; poser le
repli ne la lève pas, il rend seulement le défaut improbable au lieu de certain.

## État

`fermé` — repli posé, rendu non-Android prouvé inchangé à la mesure.
