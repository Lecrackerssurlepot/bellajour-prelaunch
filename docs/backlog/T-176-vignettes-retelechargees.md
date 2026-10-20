---
id: T-176
titre: Les vignettes de photos sont retéléchargées à chaque visite, faute de cache
etat: en cours
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
20/10/2026 (lot a5, branche du worktree `agent-a95c80f53e6a8e1a8`, non commité, non déployé) :
- **`r2.ts`** : `signerLectureVignette(key, maintenant)` signe à la date ARRONDIE au début de
  sa fenêtre d'une heure (`debutDeFenetre`, pure), valable fenêtre + marge (1 h + 1 h = 2 h :
  servie au dernier instant de sa fenêtre, une adresse vit encore une heure, comme une adresse
  `signerGet` d'aujourd'hui), avec `response-cache-control: private, max-age=7200`
  (`CACHE_VIGNETTE`). `ecrireObjet(…, { cacheControl })` pose l'en-tête AVEC l'objet, pour les
  écritures du serveur seulement. `signerGet`, `signerPut`, les TTL d'avant : inchangés.
- **Les PUT signés ne portent pas `Cache-Control`** : il faudrait que le navigateur l'envoie et
  que le CORS l'accepte, donc changer les envois et le CORS. L'en-tête de réponse signé couvre
  les vignettes nouvelles ET anciennes : rien n'est perdu.
- **Appelants passés en adresse stable** : la grille et les couvertures de dossiers de
  `/api/collectif/photos` (deux appels, l'original de repli reste `signerGet`), et les tailles
  des images de style du mur (T-172). **Aucun appelant B2C ne change** (le harnais le vérifie).
- **Preuves** : harnais (`verif-atelier.ts`, « T-176 ») : même adresse à 14:12 et 14:52, autre
  à 15:02, pire cas de validité restante = 60 min sur chaque seconde de la fenêtre, signature
  SigV4 refaite à la main et jugée acceptée jusqu'à la dernière seconde, refusée une seconde
  après. En direct contre R2 (lecture seule, une image de style) : 206 et
  `private, max-age=7200` à la date arrondie, 206 signée il y a 1 h 58, 403 il y a 2 h 02,
  `signerGet` sans en-tête. Chrome headless : avec `signerGet`, deux rendus = deux
  téléchargements (11 511 octets chacun) ; avec l'adresse stable, le second rendu vient du
  cache (0 octet), et encore après redémarrage du navigateur (cache disque).
- **Reste, hors périmètre du lot** (mêmes vignettes, toujours en `signerGet`) : le tableau de
  bord de l'espace (`edition/[token]/donnees.ts`, couvertures de dossiers et mosaïque), les
  vignettes du BAT (même fichier), la fiche atelier des éditions (`admin/collectif/donnees.ts`)
  et la grille admin des particuliers (`admin/atelier/donnees.ts`). Un mot à changer chacun.
