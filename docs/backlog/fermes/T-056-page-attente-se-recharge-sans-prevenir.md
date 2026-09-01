---
id: T-056
titre: La page qui suit le paiement se recharge cinq fois sans prévenir
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
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
**31/08/2026 — confirmé, corrigé.** `AttentePaiement.tsx` réécrit sur le parti pris de l'admin
(`Rafraichissement.tsx`) : `router.refresh()` toutes les 4 s, cinq fois, au lieu de cinq
`window.location.replace` — la page ne bouge plus sous les yeux, seuls les composants serveur
sont réévalués, et la branche disparaît d'elle-même quand le webhook a basculé l'état. Le compte
d'essais vit en état client (il survit aux refresh), plus dans l'URL : `?essai=` a disparu de
`page.tsx` (un vieux lien qui le porte est simplement ignoré). Les DEUX textes existants sont
repris à l'identique dans une région `role="status"` : l'attente est annoncée une fois, et le
passage au message « plus long que prévu » aussi. Même résultat final, mêmes bornes (5 × 4 s).
Vérifié : tsc, lint, build, `/numero/<token invalide>` rend toujours son 404 propre. **Non vu en
conditions réelles** : la branche exige un dossier en `apercu_pret` + retour Stripe, qu'on ne
fabrique pas sans écrire en base — à recetter au prochain paiement sandbox.

**Fermé le 01/09/2026.** Même raison que T-055 : le code est fait, il ne reste qu'un œil humain,
inscrit dans `docs/reference/RECETTE-VISUELLE.md` § « Ajouts du 31/08 et du 01/09 ».
