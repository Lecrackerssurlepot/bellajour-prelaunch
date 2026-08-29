---
id: T-017
titre: Le focus au clavier est invisible sur la moitié du site
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
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
**Périmé — vérifié le 29/08/2026.** Un anneau de focus existe bien : `globals.css:69`
(`:focus-visible { outline: 2px solid var(--bj-action) }`) pour le monde crème, et
`theme.css:170` (`.bj-atelier :focus-visible`) pour le monde sombre. Le ticket comptait des
feuilles sans règle locale, alors que la règle est globale et héritée.

⚠️ Ce qui reste vrai, et qui est ailleurs : la loupe ne piège pas le `Tab` et laisse atteindre le
bouton de paiement sous son fond noir (**T-055**), et le questionnaire ne déplace jamais le focus
d'un écran à l'autre (**T-051**). Ce sont de vrais défauts de navigation au clavier — mais pas
un défaut de visibilité du focus.
Fermé ici, poursuivi là-bas.
