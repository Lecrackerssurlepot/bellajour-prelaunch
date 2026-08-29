---
id: T-001
titre: Le numéro de suivi n'est jamais enregistré
domaine: donnees
gravite: bloquant
autonomie: avis-requis
ouvert: 2026-08-29
---

## Ce que Mathias a dit
Rien — trouvé par l'audit de structure du 29/08/2026.

## Ce que j'ai vérifié
`supabase/migrations/20260829_atelier_tracking_code.sql` existe sur le disque mais **est absente
de l'historique des migrations appliquées** : la colonne `numeros.tracking_code` n'existe pas en
production.

Conséquence, prouvée en lisant le code :
- `src/lib/atelier/transitions.ts:432` écrit `patch.tracking_code`.
- PostgreSQL refuse avec l'erreur `42703` (colonne inconnue).
- Les trois replis prévus (`api/admin/atelier/transition/route.ts:357`,
  `api/cloudprinter/webhook/route.ts:155`, `numero/[token]/page.tsx:95`) rattrapent l'erreur en
  **rejouant la requête SANS la colonne**.

Le geste réussit donc, l'expédition est bien enregistrée, et **le code de suivi disparaît en
silence**. C'est exactement le revers du repli 42703 documenté dans `supabase/CLAUDE.md`.

Effet réel : une cliente dont le colis est parti n'a pas son numéro de suivi. Le mail M7 porte un
encart conditionnel « Suivre le colis » qui ne s'affichera pas, et la page de son numéro n'aura
rien à montrer. Le silence est total : aucune erreur, aucun log.

## Ce que je propose
Faire appliquer la migration par Mathias (il est le seul à les rouler), puis **vérifier que la
donnée arrive vraiment** — pas seulement que la page s'affiche. Une expédition de test, et on lit
la colonne. Les replis 42703 restent en place : ils protègent la prochaine fenêtre de déploiement.

**Question pour Mathias** : peux-tu appliquer `20260829_atelier_tracking_code.sql` ? Une fois
fait, je vérifie de bout en bout et je ferme le ticket.

## Ce qui a été fait
—
