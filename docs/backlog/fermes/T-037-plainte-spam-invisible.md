---
id: T-037
titre: Un signalement en spam est enregistré mais invisible
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
Rien — trouvé en relisant le commit des rebonds Brevo.
## Ce que j'ai vérifié
Le webhook distingue bien deux cas : `email_rebond` (l'adresse est morte) et `email_plainte`
(elle a reçu, mais la cliente a cliqué « indésirable »). La distinction va jusqu'au vocabulaire
(`src/lib/atelier/recit.ts:274`).
Mais **`email_plainte` n'est lu nulle part dans l'admin** : ni tag de liste (`Liste.tsx`), ni
bandeau de fiche, ni constat sur la page Santé — les trois filtrent sur `email_rebond` seul.
Le signal n'apparaît que dans la frise du récit d'un dossier, qu'il faut ouvrir pour voir.
Effet : une plainte pour indésirable est le signal le plus direct qu'on ait sur la délivrabilité
(lié à T-022, les mails qui tombent en Promotions). Aujourd'hui il est écrit et perdu.
## Ce que je propose
Le faire remonter là où on regarde : un compteur sur la page Santé, distinct des rebonds. Pas de
tag rouge sur la ligne — une plainte n'est pas une panne, c'est une information sur nos mails,
pas sur cette cliente-là.
## Ce qui a été fait
31/08/2026 — CONFIRMÉ : le webhook écrit `email_plainte` (route `brevo/webhook`, via
`rebond.ts`), le récit le raconte (`recit.ts:305`), mais ni la Santé ni la liste ne le
lisaient. Ajouté le constat « 5 ter » sur `/admin/atelier/sante` (`sante.ts`) : les plaintes
sont lues dans la MÊME requête que les rebonds (`.in("type", [...])`, dédoublonnées par
dossier) mais rendues dans un constat SÉPARÉ, ORANGE, au vocabulaire de la délivrabilité
(« l'adresse fonctionne : elle a reçu ») — jamais mêlées au rouge « ne reçoit pas ».
Conformément à la fiche : pas de tag sur la ligne de la liste, aucune décision automatique,
affichage seul. La fiche du dossier continue de le montrer par la frise du récit.
