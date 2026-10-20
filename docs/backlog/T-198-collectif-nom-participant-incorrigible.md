---
id: T-198
titre: Le nom d'un participant ne se corrige nulle part, et « Léa » et « Lea » font deux personnes
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- Le nom est figé après le premier envoi (`src/app/depot/[token]/Depot.tsx:91-101`) ; aucun écran
  ne le corrige, ni pour le participant, ni pour le responsable, ni pour l'atelier.
- Les comptes ignorent majuscules et espaces mais pas les accents (`src/lib/collectif/dossiers.ts:76-80`).
- Le nom gardé dans le navigateur (`bj-depot-prenom`, `Depot.tsx:47-70`) ne dépend pas de
  l'édition : un téléphone prêté ou déjà venu pour une autre édition reprend ce nom.
- Un autre navigateur (WhatsApp puis Safari) ou la navigation privée compte comme un autre
  appareil : le nom est redemandé et une photo renvoyée est stockée une seconde fois
  (`src/lib/collectif/participantConnu.ts:6-9`, `moteur.ts:180-205`).

## Ce que je propose
Le responsable et l'atelier peuvent renommer une personne (toutes ses photos suivent, journal) ;
comparer les noms sans les accents ; garder le nom par édition dans le navigateur.

## Ce qui a été fait
Rien encore.
