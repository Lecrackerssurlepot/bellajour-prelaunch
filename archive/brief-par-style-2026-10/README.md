# Le brief « un style, puis ses parties » (13/10 → 14/10/2026)

`Brief.tsx` était la page `/edition/[token]/style/brief` de la révision du 13/10 (PRD §14.6) :
un onglet par magazine, le style choisi à gauche, et quatre cartes (palette, texte, doubles
pages, couvertures) qui se modifiaient CONTRE LE STYLE DÉJÀ CHOISI. Elle tenait la règle du
08/10 : « l'intérieur suit le style, seule la couverture peut venir d'un autre ».

Remplacée le 14/10/2026 par D24 (le brief se compose pièce par pièce, de n'importe quel style)
et les maquettes validées « Tout, en vrac », « Typographies » et « Modifier une partie » :
`/style/brief?m=<rang>&partie=<palette|typos|double|couverture|texte>` affiche désormais le
mur (`style/Mur.tsx`), panneau de la partie ouvert. Hors du périmètre du build (aucun import).
