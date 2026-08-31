---
id: T-066
titre: Ouvrir le questionnaire télécharge tout le moteur d'envoi de photos
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
`Composer.tsx:11-16` importe les six écrans statiquement. Vérifié dans le build : le chunk initial
de `/composer` contient `moteur.ts` (recherche de la chaîne `"Réponse incomplète"`, `moteur.ts:486`,
retrouvée dans le chunk servi).
Le sous-arbre du dépôt — `moteur.ts` (966 l.), `pool.ts`, `stockage.ts`, `useDepot.ts`,
`paliers.ts`, `Screen5Depot.tsx` (408 l.) — pèse **72 749 des 100 777 octets de source de la page,
soit 72 %**.
Une cliente qui ouvre le questionnaire pour cocher « un mariage » à l'écran 1 télécharge donc le
moteur d'envoi, le pool de workers et la couche IndexedDB. Sur 4G, cela retarde l'entrée dans le
tunnel le plus abandonné du parcours.
## Ce que je propose
Charger l'écran 5 à la demande. Il n'est atteint qu'après quatre écrans remplis : le temps de les
remplir couvre largement son chargement.
⚠️ Vérifier que le worker de vignettage et la reprise `?reprendre=` survivent au découpage — c'est
la partie délicate.
## Ce qui a été fait
**31/08 — vérifié, PAS commencé (séance close avant ; consigne : ne pas laisser un découpage à
moitié fait).** Le constat tient : `Composer.tsx:11-16` importe les six écrans statiquement, et
`Screen5Depot` tire `useDepot` → `moteur.ts`/`pool.ts`/`stockage.ts`/`paliers.ts` + `depot.css`.
Aucun changement de code — rien à annuler.

Repérage fait pour la prochaine séance :
- `next/dynamic` sur le seul `Screen5Depot` (ssr: false acceptable, purement client). Le
  fallback doit être discret et dans le ton (l'écran 5 n'est atteint qu'après 4 écrans remplis).
- **Piège worker** : `pool.ts:103` charge `new Worker(new URL('./reduire.worker.js',
  import.meta.url))` — un `.js` nu recopié brut par Turbopack. Après découpage, vérifier que
  l'URL émise existe toujours ET que le ping du pool passe (le pool a un garde-fou : un worker
  muet au ping = renonciation propre, donc l'échec serait SILENCIEUX à l'écran — tester un vrai
  dépôt de fichier en local).
- **Piège reprise** : `?reprendre=<token>` saute à l'écran 5 (`Composer.tsx:83` :
  `{ ...repris, token: reprendre, screen: 5 }`) → le chunk dynamique se charge alors SANS le
  temps de couverture des 4 écrans : le fallback doit tenir ce cas. L'écran « lien abîmé »
  (T-058, `lienAbime`) sort AVANT tout rendu d'écran et ne dépend pas de Screen5Depot — à
  re-vérifier quand même avec `/composer?reprendre=tronque123`.
- Preuve attendue : la chaîne « Réponse incomplète » (`moteur.ts:486`) absente des scripts
  initiaux de composer.html, présente dans un chunk chargé au passage à l'écran 5.
