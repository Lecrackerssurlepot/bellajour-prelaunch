# Ancien habit des interfaces (Porcelaine / Charbon), rangé le 26/11/2026

Retiré à l'étape 6 de la charte V2 (back-office, éditeur, espace de l'Édition collective, dépôt).
Rien n'est supprimé : ces extraits sont les versions d'avant (copiées depuis HEAD, extension .txt
pour qu'elles ne soient jamais compilées).

- admin.css-porcelaine-racine.txt : `.adm-root` et ses jetons `--bj-*` redéfinis, verre, deux taches floues.
- espace.css-charbon-porcelaine.txt : les jetons `--ec-*` en Charbon (nuit) et Porcelaine (`data-ec-mode="jour"`), lueurs.
- depot.css-charbon-porcelaine.txt : les jetons `--dp-*`, la lecture de `prefers-color-scheme`, les lueurs.
- RacineEspace.tsx.txt, edition-layout.tsx.txt, depot-layout.tsx.txt, admin-layout.tsx.txt : la bascule jour/nuit
  (cookie `bj_ec_mode`), Cormorant Garamond et DM Sans posées par layout.
- Le bouton soleil/lune de `Coquille.tsx` et ses règles `.ec-mode*` : voir `git show HEAD:src/app/edition/[token]/Coquille.tsx`.
`src/lib/collectif/affichage.ts` (cookie, LOGO_MODE) est laissé en place, sans appelant dans le client.
