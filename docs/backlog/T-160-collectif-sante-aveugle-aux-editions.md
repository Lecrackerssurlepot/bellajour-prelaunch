---
id: T-160
titre: Si une route de l'Édition collective échoue, rien ne le montre à l'atelier
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux vraiment que tu enregistres dans le projet euh, tous ces problèmes-là et aussi tout ce
qu'on aura, enfin, tous ces points encore à mettre et à voir » (19/10/2026).

## Ce que j'ai vérifié
- 19/10 : la page Santé de l'atelier (`src/app/admin/atelier/sante/`) ne contient pas le mot
  « collectif » : elle ne lit que les dossiers particuliers.
- Les routes du B2B signalent leurs échecs par `console.error` (34 appels dans
  `src/app/api/collectif` et `src/lib/collectif`). Sur Vercel Hobby, ces journaux ne sont gardés
  qu'une heure : un envoi de photos refusé un samedi soir ne laisse aucune trace le lundi.

## Ce que je propose
Écrire les échecs qui comptent (dépôt refusé hors plafond normal, confirmation impossible,
écriture en erreur) dans le journal de l'édition (`collectif_evenements`), et les remonter sur la
page Santé et sur la fiche de l'édition. Une alerte par mail à Mathias serait un ticket à part,
avec son accord.

## Ce qui a été fait
Rien encore.
