---
id: T-041
titre: La relève quotidienne écrit les tokens des clientes dans les logs
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/atelier/mails/relever/route.ts:159-162` et `:222` — le résumé de la relève porte le
`token` de chaque dossier examiné (`envoyes`, `incomplets`, `echecs`, `autoValides`) et part dans
un `console.log`.
Or `src/app/api/CLAUDE.md` l'interdit explicitement : « le token de 32 caractères EST l'identité.
Ne jamais exposer un token dans une URL partageable, **un log** ou un mail autre que celui de sa
cliente. »
La relève tourne tous les jours à 7 h UTC sur jusqu'à 200 dossiers. Les logs Vercel — et tout
service de collecte branché dessus — accumulent donc le mot de passe permanent de chaque cliente.
Qui les lit ouvre son dossier, ses photos, son adresse de livraison, et peut valider sa maquette
à sa place.
## Ce que je propose
Journaliser l'identifiant interne du numéro, ou un préfixe de six caractères, jamais le token
entier. Le résumé sert à savoir combien et lesquels ont bougé — un identifiant suffit, et l'admin
retrouve le dossier avec.
## Ce qui a été fait
Fait le 29/08/2026. Le journal de la relève ne porte plus qu'un préfixe de six caractères
(`abrege()`), assez pour rapprocher une ligne de journal d'un dossier dans l'atelier, pas assez
pour y entrer.
⚠️ **La réponse HTTP garde les tokens entiers, et c'est délibéré** : elle n'est lisible qu'avec le
secret de la relève, et changer sa forme casserait ce qui la consomme. Seul le `console.log` était
la fuite — c'est lui qui part dans les journaux Vercel et dans tout collecteur branché dessus.
Vérifié : types et lint au vert.
