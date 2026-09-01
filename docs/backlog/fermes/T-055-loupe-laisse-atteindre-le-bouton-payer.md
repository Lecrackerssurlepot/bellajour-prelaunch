---
id: T-055
titre: La loupe laisse atteindre le bouton payer, invisible sous le fond noir
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
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
**31/08/2026 — confirmé, corrigé.** `Loupe.tsx` : pendant l'ouverture, `inert` est posé sur les
FRÈRES de chaque ancêtre de la loupe (jamais sur les ancêtres eux-mêmes, qui la gèleraient avec
eux) — tout ce qui est sous le fond noir cesse d'être focusable et cliquable, et les lecteurs
d'écran le sortent de l'arbre. On ne marque que ce qu'on a gelé soi-même ; à la fermeture on
dégèle AVANT de rendre le focus (un élément encore inerte le refuserait). Aucun changement de
structure ni de style : la loupe reste où elle est, dans les deux chartes.
Vérifié : tsc, lint, build ; l'algorithme exact rejoué à la main sur le DOM réel de l'écran 5
(24 éléments gelés, le `.at-cta` devient inerte, la cible reste vivante, tout revient à la
fermeture). **Le composant lui-même n'a pas été vu ouvert** : il faut un dossier en `apercu_pret`
(ou la fiche admin, derrière l'auth) — à recetter à l'œil sur le prochain aperçu publié.

**Fermé le 01/09/2026.** Le correctif est posé et éprouvé sur le DOM réel. Le seul reste est un
coup d'œil humain, et un coup d'œil humain ne se garde pas dans le backlog : il est inscrit dans
`docs/reference/RECETTE-VISUELLE.md` § « Ajouts du 31/08 et du 01/09 ».
