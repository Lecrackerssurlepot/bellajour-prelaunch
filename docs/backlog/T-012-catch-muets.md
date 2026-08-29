---
id: T-012
titre: Trente `catch` muets sur des chemins qui écrivent
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
Plus de trente `catch {}` sans variable ni log, dont plusieurs côté serveur sur des chemins qui
écrivent : `api/webhook/route.ts:650`, `api/atelier/photos/complete/route.ts:62`,
`api/cloudprinter/webhook/route.ts:57`, `api/admin/atelier/interne/route.ts:33`,
`admin/atelier/[token]/telechargement.ts:80,165`. Et `lib/atelier/r2.ts:255` avale l'échec d'une
suppression (objet orphelin sur R2).
Tous ne sont pas fautifs — certains protègent volontairement un chemin best-effort. Le défaut est
qu'on ne peut pas les distinguer.
## Ce que je propose
Passer les trente en revue et les trier en trois : (a) volontaire, alors un commentaire d'une
ligne le dit ; (b) devrait journaliser, alors `logEvenement` ou `console.error` ; (c) ne devrait
pas être attrapé du tout. Ne rien changer au comportement sans savoir dans quelle catégorie on est.
## Ce qui a été fait
—
