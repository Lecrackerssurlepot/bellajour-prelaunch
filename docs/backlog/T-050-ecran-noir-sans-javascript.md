---
id: T-050
titre: Sans JavaScript, le site sert un écran noir — y compris la page qui fait payer
domaine: front
gravite: bloquant
autonomie: libre
ouvert: 2026-08-29
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
—
