---
id: T-038
titre: Le webhook des rebonds dit oui à Brevo même quand il n'a rien écrit
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — trouvé en relisant le commit des rebonds Brevo.
## Ce que j'ai vérifié
Deux endroits où une erreur disparaît, dans la même route :
1. `src/app/api/brevo/webhook/route.ts:142-147` — la route appelle `logEvenement()` sans lire son
   résultat, empile le token dans `ecrits`, et rend `200 { dossiers: N }`. Or `logEvenement` est
   best-effort strict et ne throw jamais (`evenements.ts:24-29`). Un `insert` refusé par la base
   rend donc **200 à Brevo, qui ne réessaiera pas**. Le 500 volontaire de la route ne couvre que
   la lecture, pas l'écriture.
2. `route.ts:129` — la requête de déduplication est déstructurée sans son `error`. Une lecture en
   échec donne un ensemble vide, donc une ligne en double, sans bruit.
Le reste de la route est correct : porte fermée par défaut, secret en en-tête et jamais dans
l'URL, comparaison à durée constante, hors middleware, aucun changement d'état, aucun mail.
## Ce que je propose
Lire les deux résultats. Si l'écriture échoue, rendre 500 : le rejeu de Brevo est le filet, c'est
déjà le parti pris du webhook Cloudprinter. Un webhook qui ment sur son succès perd l'information
définitivement.
⚠️ À faire avec le branchement (T-039) : tant que la route rend 404, ce défaut est théorique.
## Ce qui a été fait
—
