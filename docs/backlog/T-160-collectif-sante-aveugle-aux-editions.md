---
id: T-160
titre: Si une route de l'Édition collective échoue, rien ne le montre à l'atelier
etat: en cours
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
20/10 (lot a1, non fusionné) :
- **UN helper** : `noterEchec` (`src/lib/collectif/echecsJournal.ts`) écrit une ligne `echec` dans
  `collectif_evenements` ; le payload vient de `payloadEchec` (`echecs.ts`, pur) : `quoi`, `etape`,
  `code`, `n`, `repetitions`, rien d'autre, jamais un message brut, un code qui ressemble à un token
  masqué. Un frein : une ligne par minute pour la même édition, le même geste et la même étape, les
  suivantes comptées dans la ligne d'après (mémoire d'instance : un frein, pas une garantie). Ne
  lève jamais.
- **Appliqué** à `depot/presign` (les quatre refus 500 : lectures, écriture de la déclaration),
  `depot/complete` (lecture ratée, coffre qui ne répond pas, écriture refusée : la réponse au
  navigateur ne change pas) et au rattrapage de T-194 (lecture, coffre, écriture, vignettes
  ratées). Le journal de la fiche les lit (« Confirmation de photos impossible (12 photos) : le
  coffre n'a pas répondu »).
- **La page Santé** (`src/app/admin/atelier/sante/`) gagne un bloc « Éditions », lu en même temps
  que les dossiers, absent si `COLLECTIF_OUVERT` est fermé : par édition non archivée, les échecs
  des 7 derniers jours (rouge), les photos déclarées sans confirmation depuis plus d'une heure avec
  le dernier rattrapage, les photos sans vignette (orange). Un compte impossible se dit. La phrase
  est pure (`constatEdition`, au harnais). Captures : `scratchpad/lots/a1/sante-desktop.png`,
  `sante-mobile.png` (vraie page, lecture seule) et `sante-editions-fixture.png` (données inventées).
- **Routes non touchées** qui répondent encore une erreur serveur sans `noterEchec` (à reprendre une
  par une) : publiques `brief`, `collecte/terminer`, `dossiers`, `messages`, `messages/lus`,
  `modification`, `photos`, `photos/etat`, `photos/marquer`, `plafond`, `proposition`,
  `provenances` (et `contenus`, `messages/envoyer`, `bat`, `rendez-vous` par leurs aides de
  réponse) ; atelier : toutes celles de `src/app/api/admin/collectif/` (`editions`, `editions/[id]`,
  `geste`, `lien`, `livraison`, `lot`, `documents`, `messages`, `rendez-vous`, `mail-espace`,
  `bat/fichier`, `styles`, `agendas`, `sante`, `en-attente`).

Reste : la fiche de l'édition ne montre les échecs que dans son journal (pas d'encart dédié) ;
l'alerte par mail à Mathias reste un ticket à part, avec son accord.
