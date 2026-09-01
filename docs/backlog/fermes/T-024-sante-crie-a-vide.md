---
id: T-024
titre: La page Santé crie sur une base vide
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
« Elle signale "aucun mail parti depuis longtemps" quand il n'y a plus aucun dossier. Le constat
devrait se taire s'il n'y a rien à envoyer, pas seulement si rien n'a été envoyé. »
## Ce que j'ai vérifié
Repris de `docs/ATELIER-A-FAIRE.md`. `sante.ts` vit dans `src/app/admin/atelier/`.
Effet : une alerte qui crie à tort apprend à ne plus regarder les alertes. C'est le défaut le
plus coûteux d'un écran de surveillance, parce qu'il désarme les vraies.
## Ce que je propose
Distinguer « rien à envoyer » de « quelque chose aurait dû partir » : le constat ne se déclenche
que s'il existe au moins un dossier éligible. Vérifier au passage les autres constats de la page
pour la même faute.
## Ce qui a été fait
31/08/2026 — PARTIELLEMENT INFIRMÉ, puis complété. Le grief d'origine (« aucun mail parti
depuis longtemps » sur base vide) était DÉJÀ réparé par le commit `cf41203` : le constat nº6 ne
se déclenche que si `dusMaintenant > 0` (`sante.ts`, garde commentée « LE GARDE-FOU A CHANGÉ »).
Les autres constats ne poussent que sur des lignes existantes — aucun ne crie à vide.
Ce qui manquait encore : sur une base SANS dossier, « Rien à signaler » se lisait comme un bilan
(« tous les mails dus sont partis ») alors qu'il n'y avait rien à vérifier. Ajouté
`Sante.nbDossiers` et, sur `sante/page.tsx`, un écran calme distinct à zéro dossier (« Rien à
surveiller pour l'instant… aucun dossier n'est encore ouvert ») ; le pied passe de « aucun mail
jamais envoyé » à « aucun mail encore envoyé » dans ce cas.
NON TRAITÉ, assumé : le constat nº4 « oubliés » comptera les inscriptions anticipées tant que
l'atelier n'a pas ouvert (ETAT-PRODUCTION §atelier pas encore ouvert) — le distinguer exigerait
un réglage « date d'ouverture » qui n'existe pas et que seul Mathias peut poser.

**Fermé le 01/09/2026.** La page ne crie plus sur une base vide, ce que disait le titre. Le
constat nº4 n'est pas un ticket orphelin : il est faux **uniquement** pendant la période où
l'atelier ne compose pas encore, et cette période est déjà consignée, avec son effet exact sur
la page Santé, dans `docs/reference/ETAT-PRODUCTION.md` § « L'atelier n'est pas encore en
fonctionnement ». Le jour où l'atelier ouvre, le constat redevient vrai tout seul et il n'y a
rien à coder. Si Mathias veut le réglage avant, c'est un ticket neuf, pas celui-ci.
