---
id: T-126
titre: Le lien Canva partagé se publie sans que personne ait vu vers quel design il mène
etat: en cours
domaine: admin
gravite: bloquant
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
« Garde-fous sur le lien Canva partagé (fiche admin, action Publier la maquette). Contexte : le
21/09, la fiche de Marjorie a reçu le lien court canva.link du design « Réferences - Multi-design »
au lieu de « Marjorie - Multi-design » ; le système l'a servi fidèlement sur /numero et la cliente a
vu les références. Deux garde-fous : (1) résoudre le lien court à la saisie et afficher vers quel
design il mène (identifiant, mode, titre si lisible) avant de publier ; (2) refuser un lien en mode
édition (/edit) pour le champ partagé, le PRD §11 dit commentaire jamais édition mais transitions.ts
ne l'impose pas (Marjorie et Merisa ont toutes deux des liens /edit). »

Ce ticket porte le garde-fou (1). Le (2) est T-127.

## Ce que j'ai vérifié
- **Le constat est réel, en production, le 22/09.** `numeros.canva_url` de Marjorie vaut
  `https://canva.link/ojxycg4p5x3uugb` ; ce lien court redirige (301) vers
  `canva.com/design/DAHVd-NI0Xc/…/edit`, et la page publique de ce design s'intitule
  « Réferences ». Son lien de travail `canva.link/r1n5hr0gidmnqc0` mène à `DAHVRWatwXo`,
  intitulé « Marjorie ». Chez Merisa, lien partagé et lien de travail mènent au même design.
- **Le mail M5 ne porte pas le lien Canva** (`parametresPour`, `mails.ts`) : il envoie sur
  `/numero/<token>`, dont le bouton « Ouvrir le Canva pour commenter » sert `canva_url` tel quel
  (`BoutonValider.tsx`). Le HTML de production de la page de Marjorie contient bien
  `href="https://canva.link/ojxycg4p5x3uugb"`.
- **Rien ne regarde le lien** : `transitions.ts` (`publier_maquette`, l. 675-682) vérifie
  seulement que c'est une adresse http(s) (`estUrlSure`). Aucun écran ne montre où il mène.
- **Canva laisse lire sa page publique** : `/design/<id>/<extension>/view` répond 200 hors
  navigateur, avec `og:title` (« Réferences », « Marjorie ») et la liste d'accès du design
  (`"acl":{"rules":[…]}`), dont la règle `EXTENSION` est celle du lien « toute personne ayant le
  lien ». `/edit` répond 403, et `/view` sans extension aussi.

## Ce que je propose
Au dry-run de « Publier la maquette » (et au clic direct de l'action rapide, qui n'a pas de
dry-run), le serveur suit le lien court, lit la page publique du design et rend le titre :
« Ce lien ouvre « Réferences », en commentaire pour qui l'a. » s'affiche dans « Avant de
confirmer ». Si Canva ne répond pas, la publication passe quand même, avec une phrase qui le dit :
une panne chez un tiers ne bloque pas l'atelier, mais elle ne se tait pas. Le titre lu entre dans
le journal (`etat_change.canva_titre`) et dans le récit : « Maquette publiée, « Marjorie » ».
Module pur `canva.ts` (au harnais), réseau dans `canvaDistant.ts`, aucune migration.

## Ce qui a été fait
**22/09/2026, branche `fix/canva-lien-garde-fous`.** Module pur `src/lib/atelier/canva.ts`
(`lireLienCanva`, `urlLectureCanva`, `lireFicheCanva`, `verdictLienPartage`), réseau dans
`canvaDistant.ts` (301 du lien court avec `redirect: manual`, GET de `/view` avec un User-Agent de
navigateur, 8 s de délai, ne throw jamais). La route de transition appelle le verdict sur
`publier_maquette`, dry-run ET écriture directe (action rapide) ; la réponse du dry-run porte
`canva` et le panneau l'affiche dans « Avant de confirmer » (orange si non vérifié) ; le journal
`etat_change` reçoit `canva_titre` / `canva_role`, le récit dit « Canva « Marjorie » ».
Harnais +21, TOUT PASSE ; tsc, lint (0 erreur), build verts. Prouvé sur le build local (3005,
cookie forgé) contre la vraie base, en dry-run : le lien actuel de Marjorie rend
« Ce lien ouvre « Réferences », en commentaire pour qui l'a. », son lien de travail rend
« Marjorie », celui de Merisa « MERISA - Madeira 2026 », en 550 à 800 ms. Captures faites.
Reste : fusion, déploiement, et la correction du lien de Marjorie par Mathias (recoller le lien
Partager de « Marjorie » en commentaire puis republier ; J+7 repart de ce jour-là).
