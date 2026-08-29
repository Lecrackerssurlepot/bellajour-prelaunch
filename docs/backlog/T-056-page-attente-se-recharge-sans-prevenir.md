---
id: T-056
titre: La page qui suit le paiement se recharge cinq fois sans prévenir
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/numero/[token]/AttentePaiement.tsx:29` —
`setTimeout(() => window.location.replace(href), 4000)`, cinq fois en vingt secondes, sans
avertissement et sans moyen de suspendre.
C'est l'écran qui suit **immédiatement un débit réel**. Une cliente au lecteur d'écran vient de
payer ; à chaque rechargement la lecture repart du début, et elle n'atteint jamais la phrase de
`page.tsx:343-349` qui lui dit quoi faire si rien ne bascule. Quelqu'un en zoom 300 % perd sa
position quatre fois.
## Ce que je propose
Rafraîchir les données sans recharger la page (`router.refresh()`, déjà le parti pris de l'admin
avec `Rafraichissement.tsx`, et pour la même raison : ne pas perdre ce que la personne a sous les
yeux). Annoncer l'attente une fois, dans une région polie.
## Ce qui a été fait
—
