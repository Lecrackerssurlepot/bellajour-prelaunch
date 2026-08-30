---
id: T-011
titre: `.env.example` cache douze variables vivantes
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
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
Fait le 29/08/2026. `.env.example` documente désormais les 47 variables réellement lues
(`NODE_ENV` exclue, fournie par le runtime). Douze manquaient : les deux mots de passe
nominatifs, `CRON_SECRET`, `ATELIER_M2_DEPUIS`, et les huit templates Brevo M2, M2b, M3b, M5→M9.
Chaque entrée ajoutée dit **ce qui se tait sans elle**, pas seulement à quoi elle sert : c'est le
seul intérêt du fichier sur ce projet, où une variable absente ne fait jamais d'erreur.
Vérifié par différence entre les `process.env.*` du code et les clés du fichier : il n'en reste
aucune non documentée.
⚠️ **Découverte pendant le travail, et plus grave que le ticket** : `.env.example` n'avait
**jamais été versionné**. La règle `.env*` du `.gitignore` l'attrapait depuis l'origine du dépôt.
La seule liste des variables du projet vivait donc sur un seul disque : invisible à quiconque
clone, et perdue avec la machine. Exception `!.env.example` posée, bornée à ce fichier exact.
Vérifié dans les deux sens : le modèle est versionnable, `.env.local` reste refusé (il est en
plus protégé par une seconde règle, `.env*.local`).
Le dépôt est PUBLIC : chaque ligne a été relue avant de la versionner. Aucun secret — seules des
valeurs vides et des identifiants de templates Brevo, déjà présents dans `ETAT-PRODUCTION.md`.

⚠️ Reste ouvert : la comparaison avec ce qui est réellement posé sur Vercel (Production ET
Preview) demande Mathias. Elle ira dans `ETAT-PRODUCTION.md`.
