---
id: T-011
titre: `.env.example` cache douze variables vivantes
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
47 variables d'environnement sont réellement lues dans `src/`, `scripts/` et `middleware.ts`.
Absentes de `.env.example` alors qu'elles sont utilisées : `BREVO_TEMPLATE_M2_ID`, `M2B`, `M3B`,
`M5`, `M6`, `M7`, `M8`, `M9`, `ADMIN_PASSWORD_MATHIAS`, `ADMIN_PASSWORD_LOUIS`,
`ATELIER_M2_DEPUIS`, `CRON_SECRET`.
Effet : une variable oubliée dans un environnement ne casse pas — elle fait un SILENCE (cf. T-007).
C'est le mode de panne dominant de ce projet, et `.env.example` est la seule liste qui pourrait
l'éviter.
## Ce que je propose
Compléter `.env.example` avec les 47, groupées par tiers, chacune avec une ligne disant ce qui se
passe si elle manque. Puis comparer à ce qui est réellement posé sur Vercel (Production ET
Preview) — cette comparaison-là demande Mathias, elle ira dans `ETAT-PRODUCTION.md`.
## Ce qui a été fait
—
