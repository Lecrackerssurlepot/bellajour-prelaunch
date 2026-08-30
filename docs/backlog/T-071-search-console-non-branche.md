---
id: T-071
titre: Personne ne serait prévenu si Google rejetait le site
domaine: exploitation
gravite: confort
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de référencement du 29/08/2026.
## Ce que j'ai vérifié
`src/app/layout.tsx:39-98` — aucune clé `verification`, et aucun fichier de vérification dans
`public/`. Search Console n'est pas branché.
Donc le jour où le balisage produit est refusé, où `/magazine` sort de l'index, ou où une action
manuelle tombe sur les données structurées, **personne n'est prévenu** — et il n'existe aucun
autre canal d'alerte, l'audience n'étant pas mesurée non plus (T-020).
## Ce que je propose
Brancher Search Console : c'est gratuit, sans traceur, et c'est le seul endroit qui dise ce que
Google comprend du site. Deux minutes une fois la propriété créée.
**Question pour Mathias** : tu crées la propriété sur ton compte Google et tu me donnes la clé de
vérification ? Je ne peux pas le faire à ta place — c'est ton compte.
## Ce qui a été fait
—
