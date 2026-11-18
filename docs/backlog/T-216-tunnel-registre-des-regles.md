---
id: T-216
titre: Les règles du tunnel ne vivent que dans des fichiers Markdown et des conversations : le code ne les lit pas, rien ne les contrôle
etat: en cours
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-11-18
---
## Ce que Mathias a dit
Le 18/11 (M-11) : « On construit un système, donc ce n'est pas dans une conversation lambda : on doit l'ancrer dans le système. »
« Je veux la structure qui nous servira pour pouvoir l'améliorer, la fine-tuner, et qu'on puisse venir la nourrir avec de nouvelles
règles. » Et (M-01) : « Tu ne détermines que les règles générales. »

## Ce que j'ai vérifié
Le 18/11, sur main (91d2cab2) :
- Les règles du tunnel sont dans `docs/moteur/tunnel/` (Markdown) : S-001 à S-158, C-001 à C-063, F-001 à F-018, R-T-40 à R-T-60, les
  retours M-01 à M-11, les règles du banc (N-…, DA-…). Aucun fichier de `src/` ne les lit ; aucun test ne les tient.
- Les seuils du banc (plancher de note, page occupée, taille des photos de personnes, densité, définition en double) ne sont pas dans
  `editeur/reglages.ts`.
- Les leçons (`mep_lecons`) portent une règle, mais rien ne les compte par règle.
- Un identifiant est écrit deux fois dans le cahier de couleur (C-043, ligne 204 puis dans la liste du bas, ligne 305 : c'est un
  renvoi, pas une seconde règle).
- Constat confirmé.

## Ce que je propose
Le patron d'un SaaS : règles en données, deux familles (interdit qui bloque, préférence qui pèse), réglages séparés, versions, chaque
décision cite sa règle, retours comptés par règle, une règle neuve peut tourner « en ombre ». Le compositeur au lot suivant.

## Ce qui a été fait
18/11, branche `feat/tunnel-registre-des-regles` (poussée, pas de PR) :
- `src/lib/mise-en-page/regles/` : `types.ts` (Regle, Decision, Profil, thèmes d'album), `tunnel.ts` (M-02 à M-10 confirmées, I-01 à I-07
  codées avec leur contrôle, 28 règles N-… et 10 DA-… du banc), `reprise.ts` (260 règles reprises des cahiers, générées), `surcharges.ts`
  (53 règles des cahiers jouées au banc), `registre.ts` (`REGISTRE`, `versionRegles()`), `retours.ts` (`correctionsParRegle`).
- Six réglages de départ dans `editeur/reglages.ts` : `note_plancher` 0,45, `page_occupee_min` 0,40, `personnes_cote_min_mm` 70,
  `personnes_surface_min_cm2` 100, `densite_tout_garder` 3,0, `definition_double_ppp` 150 (PROVISOIRE, à trancher par Mathias).
- Harnais `scripts/verif-mep-regles.ts` (dans `verif-atelier.ts`) ; doc générée `docs/moteur/tunnel/REGISTRE.md` (`scripts/regles-doc.ts`).
- Écran `/admin/atelier/mise-en-page/regles` (lecture seule, filtres statut / famille / profil, corrections par règle lues par
  `GET /api/admin/atelier/mise-en-page/lecons?bilan=regles`) ; lien « Règles » sur la page des projets.

## Ce qui reste
- Le compositeur lit le registre et écrit une `Decision` par choix (lot suivant).
- Écrire en données (quand / alors) les hypothèses reprises qui disent encore « à préciser », à mesure qu'elles sont codées.
- Les profils des règles de couleur, filtres et typographie ne sont pas repris des cahiers (« tous » par défaut) : à écrire à la main.
- `definition_double_ppp` (150 ppp en pleine double) : décision de Mathias.
