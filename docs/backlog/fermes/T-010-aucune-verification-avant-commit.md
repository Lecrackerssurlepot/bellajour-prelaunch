---
id: T-010
titre: Rien ne vérifie le code avant un commit
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
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
Fait le 29/08/2026.
- Trois scripts npm : `verif` (tsc + eslint), `verif:atelier` (le harnais), `verif:tout` (les
  deux plus le build). Le harnais n'était référencé nulle part et se lançait de mémoire.
- `tsx` ajouté en devDependency explicite. Il n'était présent que comme dépendance transitive :
  un script de vérification qui en dépend aurait cassé au premier verrouillage de version.
- `.github/workflows/verif.yml`, sur les pull requests et les envois vers `main`.

⚠️ Choix assumé : **le workflow ne lance PAS `next build`**. Vercel construit déjà chaque envoi,
et dupliquer trois minutes de compilation ne dirait rien de neuf. Il couvre exactement ce que
Vercel ne regarde pas — les types, le lint, et la logique pure de l'atelier. Corollaire : les
trois vérifications tournent sans base, sans réseau et sans secret, donc sur n'importe quelle
pull request.
⚠️ Pas de crochet pre-commit local : il ralentit et se contourne. Le filet doit être là où on ne
peut pas le sauter.
⚠️ Reste ouvert : la version de Node du workflow (24) est alignée sur la machine de
développement, pas vérifiée contre celle que Vercel utilise pour ce projet. Une divergence
ferait passer ici ce qui casse là-bas.
Vérifié : `npm run verif` et `npm run verif:atelier` passent en local.
