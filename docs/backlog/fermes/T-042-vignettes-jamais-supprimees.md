---
id: T-042
titre: La vignette d'une photo supprimée reste dans le coffre
domaine: donnees
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/atelier/photos/supprimer/route.ts:71` et `photos/complete/route.ts:159` n'effacent
que `photo.r2_key`, l'original. La vignette déposée depuis D7 sous
`cleVignetteR2(numeroId, photoId)` n'est effacée **nulle part** : `cleVignetteR2` n'apparaît que
dans `presign` et `complete`, jamais dans une suppression.
Une cliente retire une photo : la ligne disparaît, l'original disparaît, et une copie 320 px
reste dans le coffre sans plus aucune ligne pour la retrouver.
Deux conséquences. Elle alimente les orphelins que T-023 compte. Et surtout : le jour où
quelqu'un demandera l'effacement de ses données (T-033), **la réponse « c'est supprimé » sera
fausse et invérifiable**.
## Ce que je propose
Supprimer la vignette dans les deux chemins, avant la ligne, comme l'original. Puis étendre le
script de purge de T-023 aux vignettes orphelines.
## Ce qui a été fait
Fait le 29/08/2026. La vignette part avec l'original dans **les deux** chemins de suppression :
`photos/supprimer/route.ts:81` (retrait par la cliente) et `photos/complete/route.ts:163` (rejet
d'une photo mesurée trop lourde).
Sans condition sur `vignette_key` : la clé est déterministe (`cleVignetteR2`), et un DELETE sur un
objet absent ne coûte rien et ne lève rien — donc les dossiers antérieurs à D7, qui n'ont pas de
vignette, passent sans traitement particulier.
L'ordre du commentaire d'origine est respecté : les objets d'abord, la ligne ensuite.
⚠️ Ne règle que l'avenir. Les vignettes déjà orphelines restent à purger avec T-023, dont le script
devra les compter aussi.
⚠️ Ne règle pas T-048 : `supprimer()` avale toujours son échec, donc « c'est supprimé » reste
invérifiable. Les deux tickets se complètent.
Vérifié : types et lint au vert.
