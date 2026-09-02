---
id: T-092
titre: Refonte du parcours questionnaire — logo officiel + Q1 à Q5
domaine: front
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09, brouillon) — point par point

**Général**
- ✅ Bien : tout est obligatoire.
- **Le logo en haut** : le nom « Bellajour » doit être **le logo officiel Bellajour (blanc)**, pas
  du texte. (Recoupe T-088 : ce logo est aussi un clic mort aujourd'hui.)

**Q1 — « C'était quoi ce moment ? »** (`Screen1Occasion.tsx`)
- Doit amener à des **mots-clés**. Pourquoi : créer en interne des templates pour différents types
  d'événements, ET avoir des **statistiques** sur ce que font le plus les gens.
- Aujourd'hui la question **se confond avec la Q2**. Il faut clarifier : Q1 = le **type
  d'événement** (+ « autre chose » = champ libre). Il faut des mots-clés pour catégoriser →
  sûrement en **rajouter**. La personne peut **additionner** les mots-clés, sans que ce soit le
  bordel. (Aujourd'hui : 7 suggestions + champ libre, mais **une seule valeur** — cliquer remplace.)

**Q2 — « Racontez. »** (`Screen2Histoire.tsx`)
- Le champ libre est nickel. C'est la **formulation de la question** qui ne plaît pas trop. À voir.

**Q3 — « Comment s'appelle ce numéro ? »** (`Screen3Titre.tsx` + `coverModels.ts`)
- Les modèles ne sont **pas une sélection** (juste donner envie / voir un potentiel résultat). ✅
- Il faudrait, **subtilement et bien fait en UX**, pouvoir **rajouter d'autres « textes »** en plus
  du texte sur la 1ère / 4ème de couverture.
- **Intégrer les visuels.** (Recoupe T-091.)

**Q4 — coordonnées** (`Screen4Contact.tsx`)
- Question : est-ce **intelligent de le mettre AVANT l'envoi des photos** ? (à réévaluer.)

**Q5 — dépôt photos** (`Screen5Depot.tsx`)
- **Wording à ENLEVER** : « Ne triez pas trop — le tri, c'est notre métier. » On n'en veut pas.
- UX : avoir un visuel avec le **bouton d'envoi et « valider » toujours présents en bas** (la
  disposition des photos est plus claire ainsi).
- Le bouton d'ajout devient **plus petit mais plus simple** : « Compléter avec d'autres photos ».
- La **barre de chargement des photos (sur 100)** fait croire que ce n'est pas assez rempli et
  qu'il faut en rajouter → **pas clair**, à revoir.

## ⚠️ Garde-fous (src/app/CLAUDE.md « Le questionnaire »)
Chaque formulation des écrans **répare une perte mesurée sur un vrai dossier** (D14, D15). Ne pas
réécrire « pour faire plus court » sans vérifier qu'on ne rouvre pas le trou. En particulier :
l'écran 4 annonce l'étape photos (une cliente avait cru le parcours fini) ; l'écran 5 ne colle rien
malgré `at-d-envoi--collee` (c'est la grille repliée qui garde le bouton en vue). La validation vient
de `@/lib/atelier/questionnaire`, jamais réécrite dans un écran.

## Statut
Mathias veut **retravailler ce parcours lui-même** ; ce ticket porte le cahier des charges détaillé
et les garde-fous. Chantier secondaire (priorité = la visionneuse maquette, T-089).
