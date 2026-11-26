# Pages restantes de l'ancienne charte (26/11/2026)

Ce qui est sorti du site quand /inviter, /merci, /carte, /offrir/merci et /numero sont passés
en charte V2. Rien n'est supprimé.

- `offrir.css` : l'ancienne feuille de /offrir (+ pages de la carte), qui lisait `noel-preview/noel.css` et `--c-*`.
- `inviter.css`, `inviter-page.tsx` : /inviter (Cormorant, `--bj-*`, bleu, logo webp).
- `merci.css`, `merci-page.tsx`, `merci-Navbar.tsx`, `components-navbar.css`, `sections-Footer.tsx`, `sections-footer.css` :
  la barre et le pied de la prévente, remplacés par Nav et Footer du site.
- `numero.css`, `numero-layout.tsx` : /numero avec ses 203 `var(--c-*)` et les polices Cormorant et DM Sans.
- `carte-page.tsx`, `offrir-merci-page.tsx` : les pages de la carte, qui lisaient `noel-preview/CarteCadeau.tsx`.

`noel-preview/` (outil interne) garde sa propre carte et sa feuille : il n'est pas touché.
