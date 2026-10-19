---
id: T-166
titre: « Retrouver mon espace » n'a aucun frein par appelant, une fois les mails ouverts elle peut servir à arroser de vraies adresses
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/app/api/collectif/retrouver/route.ts` : la réponse est identique que l'adresse soit connue
  ou non (pas d'annuaire, voulu), et un verrou limite à un mail par édition et par quart d'heure.
  Mais aucun frein par appelant : un script peut soumettre des milliers d'adresses à la suite.
- Sans effet aujourd'hui : `COLLECTIF_MAILS` est fermé, rien ne part.

## Ce que je propose
Le même frein que la connexion de l'atelier (`@/lib/frein-login`, délai croissant), en sachant
que c'est une `Map` par instance (règle de `src/app/api/CLAUDE.md`) : il freine un script naïf,
pas une attaque. À faire avec T-164, avant d'ouvrir `COLLECTIF_MAILS`.

## Ce qui a été fait
Rien encore.
