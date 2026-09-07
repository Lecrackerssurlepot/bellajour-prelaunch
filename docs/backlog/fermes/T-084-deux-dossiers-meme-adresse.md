---
id: T-084
titre: Deux dossiers ouverts pour la même adresse ne sont signalés nulle part
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-01
---
## Ce que Mathias a dit
Rien — reste détaché de T-058 le 01/09/2026, à sa clôture.
## Ce que j'ai vérifié
T-058 a bouché **une** cause de doublon : un `?reprendre=` tronqué ne poursuit plus en silence
sur un dépôt vide. Ce n'était pas la seule. Rien n'empêche, aujourd'hui, qu'une même cliente
ouvre deux dossiers — elle recommence le questionnaire parce qu'elle ne retrouve pas son mail,
elle le fait depuis un autre téléphone, le lien tombe en Promotions (T-022) et elle croit avoir
tout perdu. Le tunnel n'a **aucune authentification** : l'email est tapé à l'écran 4, et rien ne
regarde s'il existe déjà.
Et surtout, **rien côté atelier ne le dit** : ni la liste `/admin/atelier`, ni la page Santé, ni
la fiche du dossier ne signalent deux dossiers ouverts sur la même adresse.
⚠️ Ce que ça coûte, dans l'ordre de gravité : deux relances qui partent en parallèle sur la même
personne (M0 sur l'un, M2b sur l'autre) ; un dépôt de photos réparti sur deux dossiers dont aucun
n'atteint le seuil de 40 ; et le pire, l'atelier qui compose le dossier vide en ignorant que les
photos sont à côté.
⚠️ Ne PAS fusionner automatiquement. Deux dossiers sur la même adresse sont souvent
**légitimes** : la même cliente qui commande un second numéro pour un autre moment est
exactement le rachat que M8 cherche à provoquer. La règle ne peut pas être « une adresse, un
dossier ».
## Ce que je propose
Un **signalement**, jamais une décision automatique — le même parti pris que le constat des
plaintes de T-037 : on montre, on ne tranche pas.
1. Un constat sur `/admin/atelier/sante` : les adresses portant **plus d'un dossier non payé et
   non anonymisé**, en orange. Un dossier payé n'entre pas dans le compte : il est légitime par
   construction.
2. Sur la fiche d'un dossier concerné, une ligne « cette adresse porte aussi <titre> », avec le
   lien — c'est ce qui permet à l'éditeur de comprendre en une seconde avant de composer.
3. Le rapprochement se fait sur `email_canonical`, jamais sur `email` brut : les alias
   (`m.durand+bj@`) sont précisément le cas où la cliente croit être la même personne et où
   nous, non (cf. T-047).
## Ce qui a été fait (02/09, PR #27)
**Part 1 — le signalement sur `/admin/atelier/sante`.** Helper `lireDoublonsAdresse` dans
`sante.ts` : groupe par `email_canonical` les dossiers **non payés** (état hors `ETATS_ENGAGES`) et
**non anonymisés** (`anonymise_le` null, avec repli 42703 sur la colonne fraîche). Un constat orange
« N adresses portent plusieurs dossiers non payés » quand une adresse en porte ≥ 2. **Signalement
seul, jamais de fusion.**

**Part 2 — la ligne sur la fiche existait DÉJÀ** : `chargerClient`/`autres` (`donnees.ts`) charge les
autres numéros de la même `email_canonical` (`.eq(email_canonical).neq(token)`), et `Fiche.tsx` les
affiche sous « Ses autres numéros » avec le lien. Rien à ajouter.

Vérifié : `tsc`, `lint`, `verif-atelier` verts ; requête de détection **validée sur la base** en
lecture seule — 0 doublon aujourd'hui, aucun faux positif.
