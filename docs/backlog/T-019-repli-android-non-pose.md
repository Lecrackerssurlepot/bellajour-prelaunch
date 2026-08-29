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
