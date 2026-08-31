---
id: T-053
titre: Les seuls libellés de l'écran des coordonnées sont illisibles
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
`composer.css:121` — `.at-inp::placeholder{color:var(--c-text-faint);opacity:0.42}`.
Calculé : `#928d84` à 42 % sur `#020202` donne **1,90:1**, pour un seuil de 4,5:1.
Et sur l'écran 4 (`Screen4Contact.tsx:43-88`), ces placeholders — « Prénom », « Email »,
« Téléphone » — sont **les seuls libellés visibles** : il n'y a aucun `<label>`, seulement des
`aria-label` que l'œil ne lit pas.
Une cliente de 55 ans sur un téléphone au soleil voit trois traits horizontaux. Elle inverse
email et téléphone, le motif de validation la refuse, et elle ne sait pas quel champ corriger.
C'est le dernier écran avant le dépôt, et le téléphone y est désormais obligatoire (D14).
## Ce que je propose
Des libellés visibles au-dessus des champs, et le placeholder remonté au-dessus du seuil (ou
supprimé, puisqu'il devient redondant). Le libellé visible sert aussi à qui ne voit pas bien :
il reste affiché quand le champ est rempli, contrairement au placeholder.
## Ce qui a été fait
**31/08/2026 — confirmé, corrigé.** Sans toucher aux textes :
- `Screen4Contact.tsx` : « Prénom », « Email », « Téléphone » sont désormais de vrais `<label>`
  visibles (`htmlFor` → `id`, liaison vérifiée), qui restent affichés champ rempli. Les
  placeholders et `aria-label`, devenus redondants, sont partis.
- `composer.css` : `.at-lbl` (12 px, capitales espacées, `--c-text-soft` ≈ 10:1 sur le fond) ;
  le champ colle à son libellé (`.bj-atelier .at-lbl + .at-inp`). Les placeholders RESTANTS
  (écrans 1, 2, 3) passent de 0.42 à 0.85 d'opacité : ≈ 4,9:1 au lieu de 1,90:1, et le gris
  reste distinct du texte saisi (crème).
Vérifié au navigateur, 375 px (capture : trois libellés lisibles au-dessus de leurs filets) et
desktop (liaison label/champ + couleurs mesurées au DOM).
