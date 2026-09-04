# Bellajour — le socle

Maison d'édition du souvenir. « Vivez. Nous composons. »
On vend un magazine photo personnalisé : la cliente dépose ses photos et son histoire,
l'atelier compose, on imprime et on livre. Premium, jamais solennel.
**bellajour.fr sert l'Atelier** depuis le 24/08/2026 : `/` accueil, `/magazine` page produit,
`/composer` questionnaire + dépôt, `/numero/<token>` la page d'état de la cliente,
`/compte` l'espace personnel (facultatif — le lien du numéro suffit toujours),
`/admin/atelier` le back-office.

Ce fichier est le SEUL chargé à chaque session. Tout le reste se charge quand on en a besoin.
Ne rien y ajouter qui ne soit pas vrai pour toutes les tâches.

## Où vit le savoir

Chaque dossier porte son propre `CLAUDE.md`, chargé automatiquement dès que je lis un fichier
qu'il contient. **Je n'ai rien à faire : c'est le dossier touché qui apporte ses règles.**

| Je touche… | se charge | ce qu'il porte |
|---|---|---|
| `src/app/**` (pages, CSS) | `src/app/CLAUDE.md` | tokens RÉELS, polices, règles CSS, pièges de mise en page |
| `src/lib/atelier/**` | `src/lib/atelier/CLAUDE.md` | machine à états, mails M0→M9, modules purs |
| `src/app/api/**` | `src/app/api/CLAUDE.md` | webhooks, secrets, effets de bord, rate-limit |
| `src/app/admin/**` | `src/app/admin/CLAUDE.md` | back-office, auth, ce qui écrit vraiment |
| `supabase/**` | `supabase/CLAUDE.md` | les 10 tables, migrations, la règle des replis 42703 |
| `scripts/**` | `scripts/CLAUDE.md` | ce que chaque script fait, et lequel touche la PROD |

Documents lus à la demande, jamais chargés d'office :
- `docs/backlog/INDEX.md` — le travail restant, priorisé. **Le point d'entrée de toute séance.**
- `docs/reference/ETAT-PRODUCTION.md` — l'état daté du système (ce qui est branché, ce qui manque).
  Tout fait périssable va LÀ, jamais dans un `CLAUDE.md`.
- `docs/reference/RECETTE-VISUELLE.md` — les tests que Mathias peut faire à l'œil.
- `docs/reference/PARCOURS-INVARIANTS.md` — les onze garanties du tunnel et les cinq pièges qui
  ressemblent à du ménage. **À lire avant tout déplacement de fichier ou réécriture de texte
  dans `/composer` → `/numero` → `/admin/atelier`.**
- `docs/DECISIONS.md` — ce qu'on a tranché et pourquoi. À lire avant de rouvrir un débat.
- `docs/produit/VISION.md` et `ROADMAP.md` — où on va, et dans quel ordre.

## Comment on travaille

Mathias n'est pas développeur. Il décrit une intention ou un défaut ; je juge, je propose, je fais.
Le travail vit dans `docs/backlog/` : un fichier par ticket, un index qui les classe.

1. `/ticket <texte libre>` — il jette une phrase, je la classe et j'ouvre le ticket.
2. `/travailler` — je prends le ticket suivant, je VÉRIFIE d'abord qu'il est réel, puis je fais.
3. `/point` — l'état du produit en vingt lignes.
4. `/recette` — la liste des vérifications visuelles à faire, avec les URL.

Un ticket n'est jamais cru sur parole : le premier geste est toujours de vérifier dans le code
que le problème existe. Un ticket infirmé se ferme en `refuse` avec la preuve.

## Les interdits — ils ne se négocient pas

1. **Jamais de commit ni de push sur `main`.** On travaille sur une branche, toujours.
   Un hook le bloque ; s'il saute, la règle tient quand même.
2. **Jamais d'envoi de mail réel, de migration appliquée en production, de commande Cloudprinter
   ou de modification de texte légal sans accord explicite de Mathias**, demandé dans la
   conversation. Ces gestes touchent de vraies clientes et quatorze fondateurs aux droits ouverts.
3. **Jamais `git add -A` à la racine.** `design-explorations/` et `assets/typo/` sont hors git
   par décision tranchée (D4), et un ajout massif les embarquerait.
4. **Jamais supprimer du code** : on déplace dans `archive/` avec un README. (D-mémoire)
5. **Jamais inventer un chiffre, un prix, un délai ou une mesure.** Si la donnée manque, le
   ticket le dit et attend Mathias. Un grammage affirmé sans source est un mensonge à la cliente.

Tout le reste — CSS, composants, refactor, perf, SEO, tests, doc — se fait sans demander.

## Vérifier avant de dire que c'est fait

Dans cet ordre, et le résultat est rapporté tel quel, échecs compris :

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Puis, si l'atelier est touché :
`npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts` (le seul harnais de test du dépôt).

Une capture ou une vérification dans le navigateur pour tout ce qui se voit — jamais
« vérifie de ton côté ». Ce que je ne peux pas prouver, je le dis.

## Stack

Next.js 16.2.3 (App Router, `reactCompiler`) · React 19.2.4 · TypeScript strict (zéro `any`)
Supabase (service key, RLS contournée côté serveur) · Stripe · Brevo · Cloudflare R2 ·
Cloudprinter · Vercel. **Tailwind est installé mais aucune directive n'est importée : il ne
produit rien.** Tout le style est du CSS vanilla, un fichier par section.
Auth : cookie HMAC maison pour l'admin, token d'URL de 32 caractères pour la cliente, et depuis
le 04/09 **Supabase Auth pour le compte cliente** (Google + mot de passe) — en « identité
seulement » : aucun client Supabase dans le navigateur, les données passent toujours par la
service key côté serveur, et **le compte ne remplace jamais le token**.
Il n'y a **ni ORM, ni framework de test, ni CI**.
