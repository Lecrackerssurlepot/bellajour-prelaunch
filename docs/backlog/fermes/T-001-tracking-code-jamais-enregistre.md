---
id: T-001
titre: Le numéro de suivi n'est jamais enregistré
domaine: donnees
gravite: bloquant
autonomie: avis-requis
ouvert: 2026-08-29
ferme: 2026-08-29
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
Fait le 29/08/2026, avec l'accord explicite de Mathias.
**Migration appliquée en production** (`atelier_tracking_code`). Vérifié auprès de la base :
`numeros.tracking_code` existe, type `text`, nullable. La cause racine est levée — le repli 42703
ne se déclenchera plus, et le numéro de suivi sera enregistré.

**Et le garde-fou, qui est le vrai enseignement du ticket** : les deux replis 42703 des chemins
d'écriture (`transition/route.ts` et `cloudprinter/webhook/route.ts`) **journalisent désormais
quand ils se déclenchent**, en nommant la migration à appliquer. Muets, ils transformaient une
panne bruyante en donnée perdue : c'est ce qui a rendu ce bug invisible pendant une semaine.
Un filet qui efface en silence est pire que pas de filet.

⚠️ Reste à faire, et cela demande un vrai colis : vérifier de bout en bout qu'une expédition
enregistre son numéro et que l'encart de suivi apparaît dans M7 et sur la page de la cliente.
Vérifier que la page s'affiche ne suffit PAS — c'est exactement l'erreur qui a produit ce ticket.
