---
id: T-007
titre: Un mail sans template se saute en silence, à l'infini
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`src/lib/atelier/mails.ts:279` : si `BREVO_TEMPLATE_<CODE>_ID` est absent de l'environnement, le
mail est sauté et **le verrou n'est pas posé** dans `mails_envoyes`. La relève du lendemain
retentera, sautera de nouveau, et ainsi de suite — sans jamais rien signaler.
Même schéma dans `src/lib/brevo.ts:36,40` et `api/waitlist/route.ts:24,64,106`.
Seul `/admin/atelier/sante` le montre, et il faut y aller pour le voir. C'est exactement ce qui
est arrivé à M0 jusqu'au 28/08 : la variable manquait en production, personne ne le savait.
## Ce que je propose
Journaliser un `evenements` de type `mail_sans_template` au premier saut (pas à chaque relève),
et faire remonter le compte dans le retour de la relève. Le silence est le vrai défaut, pas le
mail manquant.
## Ce qui a été fait
—
