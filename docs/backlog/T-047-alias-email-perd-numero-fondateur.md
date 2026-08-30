---
id: T-047
titre: Un paiement sous alias n'attribuerait aucun numéro de fondateur
domaine: paiement
gravite: confort
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/webhook/route.ts:445-446` et `:461`. La ligne est bien résolue par
`email_canonical` — le code explique lui-même pourquoi (`:367-370` : « le paiement peut arriver
avec `x@gmail.com` alors que la colonne email stocke `x+amb1@gmail.com` »).
Mais l'étape 2 appelle `assign_numero_fondateur({p_email: email})`, dont le SQL fait
`where email = p_email` (`20260609_webhook_founder_number_allocation.sql:29,41`), et l'étape 3
filtre `.eq("filleul_email", email)` — **les deux sur l'email brut de Stripe**.
Effet : un paiement arrivé sous alias confirme la ligne, mais n'attribue aucun numéro de fondateur
(F1 partirait avec `NUMERO_FONDATEUR: ""`) et ne confirme aucun crédit de parrainage. Sans erreur :
la fonction rend `null`, l'`update` touche zéro ligne, tout répond 200.
**Gravité réelle : faible aujourd'hui.** La prévente est fermée. Le cas ne se produit que si
Mathias rebascule `PREVENTE_FERMEE` pour repasser un cas particulier — ce que `src/lib/prevente.ts`
prévoit explicitement.
## Ce que je propose
Passer `email_canonical` aux deux endroits. Cela touche une fonction SQL, donc une migration, donc
ton accord.
**Question pour Mathias** : est-il prévu de rouvrir la caisse de la prévente, même une fois ? Si
non, ce ticket peut dormir ; si oui, il faut le régler avant.
## Ce qui a été fait
—
