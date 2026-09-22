---
id: T-127
titre: Un lien Canva en édition, en lecture seule ou fermé passe la publication de la maquette
etat: en cours
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
« (2) refuser un lien en mode édition (/edit) pour le champ partagé, le PRD §11 dit commentaire
jamais édition mais transitions.ts ne l'impose pas (Marjorie et Merisa ont toutes deux des liens
/edit). »

## Ce que j'ai vérifié
- **La règle n'est pas imposée** : `transitions.ts` accepte toute adresse http(s) pour
  `canva_url`. L'écran ne fait que rappeler en orange « Mode COMMENTAIRE uniquement ».
- **Mais le chemin `/edit` ne prouve RIEN.** Le lien partagé de Marjorie se termine par
  `/edit?…&utm_source=sharebutton` et pourtant, ouvert sans compte, Canva affiche la barre
  « Commenting » ; sa liste d'accès dit `EXTENSION → role: COMMENTER`. Le bouton Partager de Canva
  écrit `/edit` dans tous ses liens, le mode est porté par la permission, pas par l'adresse.
  Refuser `/edit` refuserait donc tous les bons liens : la proposition de Mathias, prise au pied
  de la lettre, casserait la publication. Le constat de fond (rien n'empêche un lien d'édition)
  reste vrai.
- **Un design non partagé ne se lit pas, il se DÉTECTE** : sa page `/view` répond 303 vers la
  connexion (vu sur le design de travail de Jeanne, jamais partagé), comme une extension fausse.
  Un lien sans extension est celui de la barre d'adresse du propriétaire, jamais celui du bouton
  Partager.
- **Le mode se lit** dans la page publique `/view` : règle `EXTENSION` avec `role` EDITOR,
  COMMENTER, VIEWER ; absence de règle = design non partagé (« Demander l'accès »).

## Ce que je propose
Le même passage serveur que T-126 refuse la publication (422 sous le champ, avec la marche à
suivre dans Canva) quand le rôle lu est EDITOR (« donne l'ÉDITION à qui l'a »), VIEWER (« le
client ne pourra pas noter ses retouches ») ou NONE (« le client verrait Demander l'accès »).
COMMENTER passe. Canva illisible passe, en le disant (T-126). Un lien qui n'est pas chez Canva
est refusé. Règles pures au harnais.

## Ce qui a été fait
**22/09/2026, même branche que T-126.** `verdictLienPartage` refuse (422 sous `canva_url`, marche
à suivre dans la phrase) : rôle EDITOR ou OWNER (« donne l'ÉDITION à qui l'a »), VIEWER (« ne
pourra pas noter ses retouches »), NONE (« Demander l'accès »), page `/view` en 303 (design non
partagé ou extension fausse, `ferme`), adresse sans extension (« vient de la barre d'adresse, pas
du bouton Partager »), lien hors Canva. COMMENTER passe ; Canva muet (5xx, délai) passe « non
vérifié » et le dit. Le chemin `/edit` ne décide de RIEN, et le harnais le fixe. Prouvé en
dry-run sur le build local : le design de travail de Jeanne (jamais partagé) est refusé avec la
phrase « Demander l'accès », `https://x.fr/design` avec « Ce n'est pas un lien Canva ».
**PR #201 fusionnée le 22/09, déploiement Vercel `0d45f0c` READY.** Reste : la preuve en
production au premier lien refusé pour de vrai.
