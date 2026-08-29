---
id: T-050
titre: Sans JavaScript, le site sert un écran noir — y compris la page qui fait payer
domaine: front
gravite: bloquant
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
Le CSS cache tout d'entrée, et **seul le JavaScript le révèle** :
`ouverture.css:115` (`.h-titre .in{opacity:0}`), `univers.css:48` (`[data-t]{opacity:0}`),
`theme.css:258` (`.at-rv{opacity:0}`). Les classes qui lèvent l'opacité (`pret`, `joue`, `vu`)
sont posées dans un `useEffect` (`Ouverture.tsx:71`, `Univers.tsx:143-149`).
J'ai vérifié le filet supposé : le bloc `@media (prefers-reduced-motion:reduce)` d'`univers.css:705`
remet `transform` et `filter`, **jamais `opacity`**. Il ne sauve donc rien.
Si le bundle ne s'exécute pas — navigateur intégré d'Instagram, chunk en 404 pendant un
déploiement, proxy d'entreprise, JS coupé — voici ce qui est servi :
- **`/`** : une barre de tête, un bandeau photo, un pied de page. Le titre, le lede et les sept
  pages du récit sont invisibles.
- **`/magazine`** : titre, grille de prix et bouton d'achat sont tous sous `at-rv` (`Kiosque.tsx:27,
  41,84,102,117,131`). Page vide.
- **`/numero/<token>`, et c'est le pire** : la couverture est enveloppée dans `Reveal`
  (`Apercu.tsx:87`) donc invisible, mais `CasesEtCommande` (`page.tsx:376`) est HORS du `Reveal`
  donc **visible**. On demande à la cliente de payer 40 € pour une couverture qu'elle ne peut pas
  regarder — sur la seule page dont la promesse est « vous ne payez qu'après l'avoir vue ».
⚠️ Le trafic vient d'Instagram, donc du navigateur intégré de l'application, qui étouffe parfois
les scripts. C'est exactement la population concernée. Et une visiteuse qui voit un écran noir ne
signale rien : elle ferme.
## Ce que je propose
Le principe : **le contenu est visible par défaut, le JavaScript ne fait que l'animer**. En
pratique, poser l'opacité à 0 depuis le JS lui-même (une classe sur `<html>` au tout premier
rendu), de sorte qu'une page sans JS reste entièrement lisible, simplement sans mouvement.
C'est le motif habituel, et il est réversible sans toucher au séquenceur.
⚠️ À vérifier à l'œil sur les trois pages, JS coupé, avant de conclure.
## Ce qui a été fait
Fait le 29/08/2026. **Le contenu est désormais visible par défaut ; le JavaScript ne fait plus
que l'animer.**

**Mécanique** — un script EN LIGNE dans le layout racine (`ANIM_SCRIPT`) pose `data-anim` sur
`<html>` avant le premier affichage. Tout le CSS qui cache du contenu est doublé d'un filet
`html:not([data-anim])` qui l'annule. Si le script n'a pas tourné, l'attribut est absent et la
page est entièrement lisible, simplement sans mouvement.
Rien n'a été modifié dans les règles existantes : les filets sont AJOUTÉS en fin de `theme.css`,
`univers.css` et `ouverture.css`, ce qui les rend triviaux à annuler.

**Le second cas, plus vicieux** — le script en ligne passe mais le bundle n'arrive jamais (chunk
en 404 pendant un déploiement, navigateur intégré qui étouffe le module). Un chien de garde retire
`data-anim` au bout de 5 s si le code client n'a pas signé (`data-anim-ok`, posé par
`Ouverture.tsx` pour l'accueil et par `Reveal.tsx` pour `/magazine` et `/numero`).
⚠️ Contrepartie assumée : sur une liaison très lente, on perd l'animation et on garde la page.

**Vérifié à l'écran, pas seulement au type-check** — en simulant l'état « le script n'a jamais
tourné » (attribut retiré, toutes les classes du séquenceur retirées, transitions coupées) :
| Page | Résultat |
|---|---|
| `/` bureau | titre, couverture en plein écran, voile, lede et bouton — tout lisible |
| `/` en 375 px | idem, entièrement lisible |
| `/magazine` | les 13 blocs à `opacity: 1`, mot géant, grille de prix ET bouton d'achat visibles |
| parcours normal | `data-anim` posé, signature posée, classes `pret plein`, animation intacte |

⚠️ **Piège de mesure rencontré, à savoir pour la prochaine fois** : lire `getComputedStyle`
juste après avoir retiré une classe rend la valeur INTERMÉDIAIRE de la transition en cours. J'ai
d'abord conclu à tort que `/magazine` ne suivait pas. Couper les transitions et mesurer dans une
frame séparée donne la vraie valeur.

⚠️ **Ce qui reste à faire, et qui demande Mathias** : la vérification a été faite en simulant
l'état sans JavaScript, pas en le coupant réellement, et sur le serveur de développement. À
rejouer sur la préversion Vercel avec le JavaScript réellement désactivé, et si possible dans le
navigateur intégré d'Instagram — c'est la population visée.
