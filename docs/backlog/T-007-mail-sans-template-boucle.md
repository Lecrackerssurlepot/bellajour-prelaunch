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
31/08/2026 — confirmé, corrigé. Le saut reste NON bloquant (un mail ne fait jamais échouer une
action métier), mais il laisse désormais deux traces :
- `mails.ts` : `signalerSansTemplate` journalise un événement `mail_sans_template` (payload :
  `code` + `variable`) — UNE fois par dossier+code, dédoublonné par lecture préalable du journal
  (pas de contrainte unique sur `evenements`, donc pas de verrou 23505 possible ; une course
  entre deux relèves écrit au pire deux lignes, jamais une par jour). Si la lecture de
  dédoublonnage échoue, on n'écrit pas — le `console.error` par relève, lui, reste.
- Le `console.error` existant nomme maintenant la vraie variable (`M2b` → `BREVO_TEMPLATE_M2B_ID`,
  majuscules).
- `relever/route.ts` : le résumé de la relève sépare `sansTemplate` des `echecs` — un échec Brevo
  se réessaie tout seul, un template absent ne guérit jamais sans un geste sur Vercel.
- `recit.ts` : la phrase du journal (`ton: alerte`) nomme le mail ET la variable à poser.
- `verif-atelier.ts` : la phrase du journal et `templateExiste` (absent / posé / illisible).
`src/lib/brevo.ts` loggue déjà son skip avec le label (`[brevo] F1 skip — templateId manquant`) :
pas touché. Aucun événement pour la prévente (`waitlist` n'a pas de journal par dossier).
