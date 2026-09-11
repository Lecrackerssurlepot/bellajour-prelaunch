---
id: T-110
titre: La relance manuelle, ce qui reste après le premier lot
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-09-11
etat: nouveau
---
## D'où ça vient
T-109 a livré l'essentiel le 11/09 : le bouton « Relancer » sur la ligne, la colonne « Dernier
mot », les garde-fous (deux relances par motif, 72 h entre deux, adresse morte, dépôt terminé).
Trois choses de la proposition n'ont pas été faites, volontairement, pour livrer d'un bloc ce qui
manquait vraiment. Elles sont ici pour ne pas être oubliées.

## Ce qui reste
1. **La relance groupée.** Une case à cocher par ligne, un bandeau « 3 dossiers sélectionnés →
   Relancer les 3 », avec le décompte de ce qui partira vraiment et de ce qui sera écarté (une
   adresse qui rebondit n'est pas relancée). C'est le geste du lundi matin. Le serveur relit la
   règle dossier par dossier, comme aujourd'hui : la sélection ne décide de rien.
2. **La pile « Sans réponse ».** Aujourd'hui les dossiers muets sont noyés dans « Chez le
   client ». Une pile à part, entre « À faire » et « Chez le client », les rassemblerait.
   ⚠️ Elle touche `urgence.ts`, qui porte le tri de toute la table de travail ET la lecture de la
   page cliente (`QUI_ATTEND`). À faire proprement ou pas du tout.
3. **Le téléphone sur la ligne.** Quand l'adresse a rebondi, le bouton s'éteint et dit « il faut
   appeler » — mais le numéro n'est que sur la fiche. `LigneDossier` ne porte pas `telephone` ;
   l'ajouter mettrait le bouton « Appeler » directement sur la ligne, comme dans la maquette.

## À prouver, et ça ne peut être que Mathias
**Le chemin d'envoi réel n'a jamais été exercé.** Tout est vérifié en démonstration et par le
harnais ; personne n'a encore cliqué « Relancer » sur un vrai dossier, parce que ça écrit à une
vraie personne. Au premier usage : vérifier que le mail arrive, et que le journal du dossier
porte bien la ligne `relance_manuelle` signée.

## Où c'est dessiné
Les trois écrans sont dans le canevas du 11/09 :
`https://claude.ai/code/artifact/291e130a-6a30-4102-b615-8a87a41ca8d6` (page « Piste I »).
