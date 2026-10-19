---
id: T-176
titre: Les vignettes de photos sont retéléchargées à chaque visite, faute de cache
etat: nouveau
domaine: exploitation
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/lib/atelier/r2.ts` : aucun `CacheControl` posé à l'envoi, aucun `ResponseCacheControl`
  sur la signature de lecture (aucune occurrence, 19/10), et l'adresse signée change à chaque
  rendu (`X-Amz-Date`). Le navigateur ne peut donc rien réutiliser : environ 2,4 Mo par page de
  grille à chaque retour sur Photos (120 vignettes d'environ 20 Ko, estimation).

## Ce que je propose
Poser `Cache-Control: private, max-age=…` sur les vignettes, et signer des adresses stables par
fenêtre de temps (date de signature arrondie à l'heure) pour qu'une même vignette garde la même
adresse le temps de sa validité.

## Ce qui a été fait
Rien encore.
