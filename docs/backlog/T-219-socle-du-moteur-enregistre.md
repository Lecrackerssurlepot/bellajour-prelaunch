---
id: T-219
titre: Le socle du moteur (sept moteurs, P0 à P7, 1 234 règles) n'existe que hors du dépôt et dans une conversation
etat: en cours
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-11-19
---
## Ce que Mathias a dit
Le 19/11 : « On a déjà une bonne dose ! Comment tu enregistres tout le système dans le code pour l'analyse et le code ? On verra la
partie UX plus tard ! Tu peux juste enregistrer toutes les infos ? » Puis ses réponses aux questions du socle (M-35 à M-57,
`docs/moteur/tunnel/RETOURS-MATHIAS.md`).

## Ce que j'ai vérifié
Le 19/11, sur main (7de6938b) :
- Le socle est dans `design-explorations/tunnel-2026-11-17/socle/` (hors git, D4) : 1 234 règles (`regles.json`), 1 082 noms de
  paramètres, 149 informations, 27 questions, l'intégration des cinq lots (`30-INTEGRATION.md`), 15 questions et 43 en annexe.
- Aucun fichier de `src/` ne le lit ; aucun contrôle ne le tient ; ses colonnes « source » et « vérifiable sur » nomment les magazines de
  test, leurs lieux et des numéros de photos (M-01).
- Constat confirmé.

## Ce qui a été fait (19/11, branche `feat/socle-enregistre`, poussée, pas de PR)
- **Données** (`src/lib/mise-en-page/regles/socle/`) : les 1 234 règles (moteur, priorité, quand, alors, paramètres, repli, profils,
  informations, source, statut, état d'intégration, liens `reprend` / `remplace` vers le registre), 1 023 paramètres (les 47 groupes en
  double fusionnés, 75 anciens noms en alias, 92 reliés au réglage du code qui porte la même valeur), 151 informations avec leur libellé
  d'atelier, 27 questions et ce que chaque réponse règle, les profils, thèmes, curseurs et écoles, les 58 questions à trancher et les
  24 conflits. Import rejouable : `scripts/socle-import.ts` (nettoyage M-01, arbitrages et réponses de `socle/decisions.ts`).
- **Ses réponses du 19/11** : M-35 à M-57 au registre (`regles/decisions1911.ts`) et dans les données ; la n° 8 reste ouverte.
- **Contrats entre moteurs** en types (`src/lib/mise-en-page/moteurs/contrats.ts`), cercle Mise en page ↔ Habillage coupé (6a / 6b).
- **Contrôles** : `scripts/verif-mep-socle.ts` (lancé par `verif-atelier.ts`), test des rivaux dans sa forme simple compris.
- **Docs** : `docs/moteur/tunnel/socle/` (copies nettoyées et tables générées), partie socle de `REGISTRE.md`, README, D34.
- Rien de câblé : le compositeur et l'éditeur composent exactement comme avant (rejeu de fidélité identique, harnais).

## Ce qui reste
- Lui réexpliquer la question n° 8 (un couple reste « couple » en long voyage, deux photos par double).
- Les « à préciser » de ses réponses (écart des moments réunis, part d'un sujet « beaucoup », seuil de chaleur du recadrage prudent,
  variantes par double, plus d'entorses en stylisé, ordre entre densité serrée et pages en plus) : des valeurs à lui faire choisir au banc.
- Câbler : le compositeur lira les paramètres et les règles du socle lot par lot ; aucune valeur ne remplace encore `editeur/reglages.ts`.
  Le code bloque toujours sous 150 ppp (N-56) alors que M-44 dit « pas de limite pour l'instant ».
- Les 82 replis à écrire, les 19 règles à corriger, la règle restée à trancher (TRI-056, l'écart « inimprimable » face à M-44).
- Le test des conflits « qui fait céder qui » sur les magazines de référence (PROCESSUS §7.3, test b) : la forme simple ne lit que les mots.
- L'écran (UX) : plus tard, à sa demande.
