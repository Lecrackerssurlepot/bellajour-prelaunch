---
id: T-055
titre: La loupe laisse atteindre le bouton payer, invisible sous le fond noir
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/components/Loupe.tsx:83-108` — l'effet gère `Escape`, les flèches et rend le focus à la
fermeture, mais **ne piège pas le `Tab`**, et le reste de la page n'est ni `inert` ni
`aria-hidden`.
Sur `/numero/<token>` en état 2, la loupe s'ouvre par-dessus `CasesEtCommande`. Une cliente au
clavier qui agrandit sa couverture et appuie trois fois sur Tab pose son focus sur les deux cases,
puis sur le bouton « Commander — 40 € », **invisible sous le fond noir**. Un Entrée de trop et
Stripe s'ouvre alors qu'elle regardait une image.
## Ce que je propose
`inert` sur le reste de la page pendant l'ouverture (une ligne, largement supporté), ce qui règle
le piège de focus et l'annonce du lecteur d'écran d'un seul geste.
## Ce qui a été fait
—
