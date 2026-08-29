# Bellajour

Maison d'édition du souvenir. Un magazine photo personnalisé, en édition d'un exemplaire.
La cliente dépose ses photos et raconte son moment ; l'atelier compose ; on imprime et on livre.

Site en production : **bellajour.fr** — Next.js 16, TypeScript, Supabase, Stripe, Brevo,
Cloudflare R2, Cloudprinter, Vercel.

## Démarrer

```bash
npm install
npm run dev
```

Les variables d'environnement sont dans `.env.local` (jamais versionné). Voir `.env.example`,
et `docs/reference/ETAT-PRODUCTION.md` pour ce qui doit être posé sur Vercel.

## Où trouver quoi

| Question | Fichier |
|---|---|
| Les règles du projet, et où vit chaque savoir | `CLAUDE.md` |
| Le travail restant, priorisé | `docs/backlog/INDEX.md` |
| L'état daté du système (ce qui est branché, ce qui manque) | `docs/reference/ETAT-PRODUCTION.md` |
| Ce qu'on a tranché, et pourquoi | `docs/DECISIONS.md` |
| Ce qu'on vend, et où on va | `docs/produit/VISION.md`, `ROADMAP.md` |
| Les vérifications visuelles à faire soi-même | `docs/reference/RECETTE-VISUELLE.md` |
| La bascule en production le jour du lancement | `docs/reference/BASCULE-LANCEMENT.md` |

Chaque dossier de code porte son propre `CLAUDE.md` (`src/app/`, `src/lib/atelier/`,
`src/app/api/`, `src/app/admin/`, `supabase/`, `scripts/`) : les règles arrivent quand on ouvre
le dossier, pas avant.

## Vérifier

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Puis, si l'atelier a bougé :

```bash
npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts
```

C'est le seul harnais de test du dépôt : il couvre les modules purs de l'atelier (transitions,
urgence, mails, lot) sans base ni réseau.

## Règles qui ne se négocient pas

Aucun commit ni push sur `main` — on travaille sur une branche. Aucun envoi de mail réel,
migration en production, commande d'impression ou modification de texte légal sans accord
explicite. Rien n'est supprimé : le code mort part dans `archive/` avec un README.
