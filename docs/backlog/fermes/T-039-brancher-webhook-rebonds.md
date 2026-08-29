---
id: T-039
titre: Le webhook des rebonds n'écoute rien tant qu'il n'est pas branché
domaine: exploitation
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — trouvé en relisant le commit des rebonds Brevo.
## Ce que j'ai vérifié
`BREVO_WEBHOOK_SECRET` est présente dans `.env.local`, donc la route marche en local.
`docs/reference/ETAT-PRODUCTION.md:38-44` la déclare **non branchée en production**.
Sans la variable sur Vercel, `autorise()` rend `false` et la route répond **404** — comportement
correct et volontaire, mais elle n'écoute rien. Et même la variable posée, il faut encore créer
le webhook côté Brevo.
Effet : le commit qui devait supprimer une panne silencieuse est lui-même, aujourd'hui, une
fonctionnalité silencieusement inactive. C'est la forme la plus coûteuse : on croit le problème
réglé.
## Ce que je propose
Deux gestes, dans cet ordre : poser `BREVO_WEBHOOK_SECRET` sur Vercel (Production et Preview) et
redéployer, puis déclarer le webhook chez Brevo sur les événements `hardBounce`, `blocked`,
`invalid`, `spam`, avec le secret en en-tête.
⚠️ Trancher T-036 AVANT de déclarer l'abonnement : si la graphie `invalid` n'est pas reconnue,
on branche un tuyau qui jette une partie de ce qu'il reçoit.
Vérification : provoquer un rebond réel sur une adresse inexistante, et voir le tag apparaître
dans l'atelier.
**Question pour Mathias** : tu poses la variable et tu crées le webhook chez Brevo, ou tu veux
que je te prépare les valeurs exactes à coller ?
## Ce qui a été fait
—
