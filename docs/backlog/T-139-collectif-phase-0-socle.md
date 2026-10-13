---
id: T-139
titre: Il n'existe aucun socle pour ouvrir une édition collective sans toucher au B2C
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« On ajoute au site un second produit : l'édition collective (espace pro B2B), à côté de
l'Atelier B2C, sans rien changer au B2C. […] Je veux pouvoir ouvrir de vraies éditions de test et
tout utiliser de bout en bout (phases 0 à 6). La phase 7 (mails, relances, temps réel…) est
seulement à prévoir dans la structure, pas à coder. »

## Ce que j'ai vérifié
- `photos`, `evenements` et `mails_envoyes` ont `numero_id … references numeros(id)` : un helper
  B2C appelé avec l'id d'une édition échouerait sur la contrainte, en silence (aucun ne lève).
  D'où des tables `collectif_*` à part.
- `enrichissement.ts` sépare déjà son cœur (`lirePhoto`, `lireDepuisCoffre`, sans table) de ce
  qui écrit (`enrichirPhotos`, table `photos` en dur) : on importe le cœur, on ne paramètre rien.
- Le moteur d'envoi B2C (`moteur.ts`) garde une copie IndexedDB de chaque photo et
  `purgerAutresTokens` efface celles des autres dossiers : inutilisable à 2 000 photos, dangereux
  s'il était partagé. Module séparé en phase 3.
- Le middleware couvre déjà `/admin/:path*` et `/api/admin/:path*` : rien à y toucher.
- Une page App Router ne peut pas répondre 503 : seules les routes API le peuvent.
- `Date.parse("le 4 octobre")` rend une date de 2001 (prouvé au harnais) : une clôture saisie
  ainsi aurait fermé la collecte. D'où `lireInstant` (ISO avec fuseau seulement).

## Ce que je propose
Phase 0 du PRD §11, livrée sur `feat/collectif-phase-0` :
- l'interrupteur `COLLECTIF_OUVERT` (404 partout sans lui, lien admin absent) ;
- la migration `supabase/migrations/20261013_collectif.sql`, ÉCRITE, NON APPLIQUÉE (13 tables,
  atomique, RLS sans policy, aucun chiffre par défaut, tours publiés figés par trigger) ;
- `src/lib/collectif/` : types, états, gestes, verrous, plafonds, droits, clés R2 (purs), plus
  `acces.ts` et `sante.ts` (lecture) ; son `CLAUDE.md` ;
- les portes : `/edition/[token]`, `/depot/[token]`, `/admin/collectif`,
  `/api/admin/collectif/sante` ;
- `scripts/verif-collectif.ts`.

**Recette** : interrupteur absent, tout le B2B répond 404 et la table de travail n'a pas le lien ;
interrupteur ouvert sans migration, les liens affichent « Migration collectif absente » et
l'API répond 503 ; le B2C est identique.

**Avis requis** : Mathias applique la migration (jamais moi sans son accord).

## Ce qui a été fait
13/10/2026 : tout le périmètre ci-dessus, sur branche, PR ouverte. `tsc`, `lint`, `build`,
`verif-atelier.ts` (1450 vérifications) et `verif-collectif.ts` (151) verts. Recette au `curl`
sur un build servi deux fois (3005 sans interrupteur, 3006 avec) : 404 réels partout sans
l'interrupteur ; avec lui, écran « Migration collectif absente » (noindex, no-referrer), 503
`migration_collectif_absente` qui nomme les 13 tables, lien admin présent ; `/`, `/magazine`,
`/composer`, `/admin/atelier` en 200 sur les deux. Reste : la fusion, puis la migration.
