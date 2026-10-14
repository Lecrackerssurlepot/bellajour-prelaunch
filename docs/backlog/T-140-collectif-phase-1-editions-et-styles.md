---
id: T-140
titre: L'atelier ne peut ni ouvrir une édition collective ni créer les styles du mur
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« Je veux pouvoir ouvrir de vraies éditions de test et tout utiliser de bout en bout (phases 0 à
6). »

## Ce que j'ai vérifié
Rien n'existe encore côté atelier (`/admin/collectif` n'affiche que l'état de la migration,
T-139). Maquettes : `Atelier.dc.html` (liste), `Creation.dc.html` (formulaire), `Fiche.dc.html`.

## Ce que je propose
PRD §8, phase 1 :
- `/admin/collectif` : la liste (client, magazines, état effectif, prochaine étape et camp,
  échéance, non-lus) ;
- `/admin/collectif/nouvelle` : tous les réglages du §9.1, **chiffres saisis par l'atelier, aucun
  pré-rempli** ; trois liens générés (`generateNumeroToken`), aucun mail ; case « Édition de
  démonstration » visible et désactivée (phase 7) ; `suggestionEmail` sur l'adresse du
  responsable ; la date de clôture saisie à l'heure de Paris et envoyée en ISO avec fuseau ;
- `/admin/collectif/[id]` : réglages, liens (copier, régénérer = l'ancien coupé aussitôt),
  journal, les gestes de `gestes.ts` (Clore, Rouvrir, Archiver) en deux temps ;
- `/admin/collectif/styles` : l'éditeur (nom, slug, description, segment, palettes, typos,
  couvertures, cinq doubles pages, ordre, publier/dépublier), images vers
  `collectif/styles/<slug>/…` ; **prioritaire**.
- Toutes les écritures sous `/api/admin/collectif/*`, journalisées dans `collectif_evenements`.

**Juste après** : le test de rendu d'un vrai PDF Affinity par pdf.js (il décide de l'architecture
du BAT, T-144). Il faut un export réel de 24 à 40 pages de Mathias.

**Recette** : créer un style avec ses images, une édition à deux magazines, copier les trois liens.

## Ce qui a été fait
13/10/2026, branche `feat/collectif-phase-1` :
- **Liste** `/admin/collectif` (état effectif, prochaine étape et camp, clôture, tirage,
  non-lus, filtre « Archivées »), **création** `/admin/collectif/nouvelle` (aucun chiffre
  pré-rempli, clôture saisie à l'heure de Paris, case démonstration désactivée, aucun mail),
  **fiche** `/admin/collectif/[id]` (réglages, trois liens copier / ouvrir / régénérer, gestes
  Clore, Rouvrir, Lancer l'impression, Expédier, Livrée, Archiver, Récupérer armés en deux
  temps, magazines, journal).
- **Éditeur de styles** `/admin/collectif/styles` et `/styles/[id]` : nom, adresse définitive,
  public, ordre, description, palettes de 4 couleurs, typos + échantillon en image,
  couvertures, cinq doubles pages types, publier / retirer du mur (refusé tant qu'il manque
  quelque chose, la liste le dit).
- 7 routes sous `/api/admin/collectif/*` ; modules purs `dates`, `saisie`, `styles`,
  `prochaine`, `recit`, `liens` ; harnais `verif-collectif.ts` porté à 204 vérifications.
- **Recette faite en local contre la base de production** (13/10) : une édition d'essai créée,
  réglée, close, rouverte, un lien régénéré (l'ancien répond 404), un magazine ajouté puis
  retiré, archivée (ses liens répondent 404) ; un style d'essai créé, une image envoyée et
  relue sur R2, publication refusée parce qu'incomplet. Les deux sont nommés « Essai
  technique » ; l'édition est archivée, le style reste en brouillon.
- **Reste** : la recette de Mathias (créer son premier vrai style, une édition à deux
  magazines, copier les trois liens), puis le test d'un vrai PDF Affinity.
