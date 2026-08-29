---
id: T-010
titre: Rien ne vérifie le code avant un commit
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
Pas de `.github/workflows`, pas de `.husky`, `.git/hooks` vides, aucun `*.test.ts`.
`package.json` n'expose que `dev`, `build`, `start`, `lint` : **`verif-atelier.ts`, le seul
harnais de test du dépôt, n'y est même pas référencé** et se lance de mémoire.
Effet : rien n'empêche un commit qui ne compile pas. Sur un site qui vend, c'est le déploiement
qui joue le rôle de test.
## Ce que je propose
Le minimum qui sert vraiment, pas une usine :
1. Trois scripts npm : `verif` (tsc + lint), `verif:atelier`, `verif:tout`.
2. Un workflow GitHub Actions sur les pull requests qui lance `verif:tout`.
Pas de pre-commit local : il ralentit et se contourne. Le filet doit être là où on ne peut pas
le sauter.
## Ce qui a été fait
—
