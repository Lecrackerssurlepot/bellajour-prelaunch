# Le mode « compact » de PanneauLiens (archivé le 19/10/2026, T-185)

`PanneauLiens.tsx` avait un mode `compact` (« la vue d'ensemble de la fiche, T-152 ») : une
ligne par lien, « Copier » et « Ouvrir » seulement. Depuis la fiche en cartes du 15/10, la vue
d'ensemble ne l'appelait plus (`page.tsx` passait `<PanneauLiens id liens />` sans `compact`),
et l'audit du 19/10 l'a relevé comme code mort (T-185).

- `PanneauLiens.tsx` : le fichier ENTIER tel qu'il était avant le retrait (le mode compact est
  le bloc `if (compact) { … }`).
- `eca-liens-compacts.css` : ses règles, retirées de `collectif.css`.

Pour le remettre : rajouter la prop `compact`, le bloc et les règles, puis l'appeler depuis la
vue d'ensemble de la fiche.
