---
id: T-217
titre: L'éditeur ne pose pas de questions et ne compose rien : « Lire les photos » ne fait que poser des tags
etat: en cours
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-11-18
---
## Ce que Mathias a dit
Le 18/11, après avoir essayé « Lire les photos » : « il n'y a pas de questions puis de composition ! On doit créer l'éditeur intelligent
qui crée. »

## Ce que j'ai vérifié
Le 18/11, sur main (9bbaf919) :
- `[id]/LireLesPhotos.tsx` lance l'entonnoir A/B/C et écrit une lecture IA v2 : des tags sur les vignettes, rien d'autre.
- Aucune question n'est posée avant ; aucun module de `src/lib/mise-en-page/` ne compose un magazine. Le compositeur ne vit que sur le
  banc (`design-explorations/tunnel-2026-11-17/compositeur/`, hors git) : Python + un poseur TypeScript chargé par chemin.
- Le seul chemin pour charger un magazine composé est le premier jet (fichier JSON, `chargerPremierJet`).
- Constat confirmé.

## Ce qui a été fait
Branche `feat/editeur-qui-compose`, 18/11 (couche C20, règles R197 à R205) :
- Le compositeur porté en TypeScript pur (`src/lib/mise-en-page/compositeur/`) : fiche, sélection, trame, pose, contrôle. Rejoué sur le
  projet de test du banc (`scripts/compositeur-rejeu.ts`) : mêmes magazines que le Python de la passe 10, dans les deux tailles
  (dispositions, recadrages, textes, couverture identiques ; mêmes comptes ; mêmes fautes dures).
- Lecture IA v3 (tags de planche B5, voyage, lieux) ; étapes `voyage` et `lieux` de la route `lecture-ia`, sous la même garde ; règle de
  dégradation (40 + 20 regards, 600 photos lues au plus).
- « Composer le magazine » : les questions, l'analyse sous les yeux (coût avant, coût payé), la proposition chargée comme un premier jet
  (une entrée d'historique), « Remplacer la mise en page ? », le bandeau, « Posées et laissées » avec « Faire entrer », M-10 à l'écran.
- Harnais `scripts/verif-mep-compositeur.ts` (cinq lots fabriqués, M-05, fiche, M-10, M-01, v3, garde) dans `verif-atelier.ts`.

## Ce qui reste
- L'essai de Mathias sur une création libre, puis sur un dossier (`MEP_LECTURE_IA_CLIENTS=1`).
- Un premier appel RÉEL des étapes voyage et lieux depuis l'éditeur (la recette les a simulés) ; mesurer leur coût réel.
- Le raccord au registre des règles (T-216) : citer les règles par leur objet au lieu de chaînes.
- Les limites du moteur (gabarits 21:9, ouverture à plusieurs photos, couverture panoramique, filtres) restent hors de ce lot.
