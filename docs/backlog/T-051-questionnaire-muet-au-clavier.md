---
id: T-051
titre: Le questionnaire est muet pour qui n'utilise pas la souris
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
Quatre défauts qui se cumulent sur le même parcours :
1. `Composer.tsx:204` — le changement d'écran remonte tout le sous-arbre. Aucun `focus()` déplacé,
   aucune région live. À chaque « Continuer », le focus retombe sur `<body>` sans un mot. Après
   « Envoyer à l'atelier », l'écran 6 n'est **jamais énoncé** : elle ne sait pas si ses photos
   sont parties.
2. `Composer.tsx:98` et `:259` — le message d'erreur est la MÊME chaîne à chaque tentative, et le
   `<p role="alert">` n'est pas remonté. **Deuxième clic avec la même erreur : React ne re-rend
   pas, rien n'est annoncé.** Elle conclut que le bouton est cassé.
3. `Screen5Depot.tsx:228` — la région `role="status"` du palier change à chaque photo confirmée,
   soit jusqu'à 40 annonces d'affilée. Le lecteur d'écran parle sans interruption pendant l'envoi,
   et noie le `role="alert"` de la ligne 344.
4. `Screen5Depot.tsx:259` — la liste des fichiers refusés apparaît sans `aria-live` et sans
   déplacement du focus. Elle dépose 60 photos, 8 sont écartées, elle ne le saura jamais.
## Ce que je propose
Un point de focus par écran (le titre, `tabindex="-1"`), une région live unique qui annonce
l'écran atteint, une clé qui change sur le message d'erreur pour forcer l'annonce, et un
`aria-live` sur les refus. Le compteur de palier passe en `aria-live="off"` : il est utile à
l'œil, pas à l'oreille.
## Ce qui a été fait
**31/08/2026 — confirmé (les quatre points), corrigé.** Les anneaux de focus existaient déjà
(T-017 : `theme.css:170`), c'est le DÉPLACEMENT du focus qui manquait :
1. `Composer.tsx` : à chaque changement d'écran, le focus va sur le `<h2>` de l'écran atteint
   (`tabindex="-1"` posé au vol, `preventScroll`), jamais au premier rendu. Une région live
   unique (`.sr-only`, `aria-live="polite"`, présente dès le premier rendu) annonce « Étape N
   sur 6 » / « C'est fait — dernier écran ». L'écran 6 est donc énoncé.
2. `Composer.tsx` + `Screen4Contact.tsx` + `Screen5Depot.tsx` : une clé (`erreurCle`) change à
   chaque refus — le même message est REMONTÉ par React et ré-annoncé (vérifié : nœud recréé,
   texte identique, `role="alert"`).
3. `Screen5Depot.tsx:` le palier perd son `role="status"` : jusqu'à 40 annonces d'affilée qui
   noyaient les alertes. Utile à l'œil, pas à l'oreille.
4. Les refus à l'entrée vivent dans une enveloppe `aria-live="polite"` TOUJOURS rendue (une
   région créée en même temps que son contenu n'est pas annoncée).
Vérifié au navigateur (375 px et desktop) : focus sur H2 mesuré à chaque transition 1↔4, région
live mise à jour, ré-annonce du refus prouvée au DOM. Parcours 1→5 inchangé par ailleurs.
