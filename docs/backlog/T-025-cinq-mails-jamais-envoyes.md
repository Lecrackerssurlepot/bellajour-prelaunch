---
id: T-025
titre: Cinq mails n'ont jamais été envoyés en vrai
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« M5 et M6 sont prouvés de bout en bout, M2 l'a été involontairement. Restent M3b, M7, M8, M9 et
l'auto-validation à J+7 — cette dernière ne peut se tester que sur un dossier en état 4. »
## Ce que j'ai vérifié
Repris de `docs/ATELIER-A-FAIRE.md`. Note : M7 a depuis été prouvé en sandbox Cloudprinter le
26/08 (ItemShipped → état 7 → M7 parti), et M8 aussi. À reconfirmer avant de refaire le test.
Le harnais `verif-atelier.ts` couvre la LOGIQUE (quel mail, quand, avec quels paramètres) mais
ne peut rien dire du rendu, de la délivrabilité ni des variables réellement substituées.
## Ce que je propose
Une recette d'envoi réel sur un dossier de test, mail par mail, avec lecture dans une vraie boîte
Gmail (lié à T-022). `scripts/recette.mjs` sait vieillir un dossier pour déclencher chaque relève.
**Question pour Mathias** : on la fait quand ? Elle exige d'agir sur la base de production et
d'envoyer de vrais mails — donc ton feu vert, et une adresse de test à toi.
## Ce qui a été fait
—
