---
id: T-017
titre: Le focus au clavier est invisible sur la moitié du site
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`:focus-visible` est présent dans 17 feuilles sur 34. Absent notamment de
`(atelier)/components/*.css` (hors `nav.css`), `sections/footer.css`, `legal/legal.css`,
`magazine/pdp.css`, `ambassadeurs/{hero,onglets,engagement}.css`.
Par ailleurs 62 `aria-label` pour 84 `<button>` : l'écart est à instruire au cas par cas, tous
les boutons n'ont pas besoin d'un label explicite.
## Ce que je propose
Un anneau de focus commun, une fois, dans `globals.css`, dérivé de `--bj-action` côté crème et de
`--c-accent` côté sombre — puis retirer les surcharges locales qui l'annulent. Vérifier à la
tabulation sur `/`, `/magazine`, `/composer` et une page légale.
## Ce qui a été fait
—
