---
id: T-166
titre: « Retrouver mon espace » n'a aucun frein par appelant, une fois les mails ouverts elle peut servir à arroser de vraies adresses
etat: fermé
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
ferme: 2026-10-20
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
Le 20/10, branche `fix/collectif-mails-origine-et-frein`, avec T-164. Revérifié : aucun frein
par appelant sur `/api/collectif/retrouver`, seul le verrou d'un mail par quart d'heure et par
édition.

Changé : `creerPlafond(3)` (`@/lib/compte/garde`), trois demandes par minute et par appelant,
contrôlé AVANT de lire le corps ; au-delà, 429 `trop_de_demandes` et une phrase que le
formulaire affiche déjà (« Trop de demandes d'un coup. Réessayez dans une minute. »).

Pourquoi pas `@/lib/frein-login` comme la fiche le proposait : il compte des ÉCHECS et efface
l'ardoise au succès, or « Retrouver » n'a ni échec ni succès à distinguer sans dire si l'adresse
est connue. `creerPlafond(3)` est le frein de « mot de passe oublié », la route sœur du compte
(publique, réponse identique, un mail au bout). Il compte l'appelant, jamais l'adresse : le
refus ne dit rien de la base. Même limite que tous les freins du site : une `Map` par instance
Vercel, un frein pour un script, pas un mur.

Harnais : le plafond, sa place avant `lireCorps`, le 429 avec sa phrase. Prouvé en retirant la
ligne : KO, puis TOUT PASSE une fois remise.
