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

## 18/11 au soir : « C'est un échec ! » (vrai dossier de 164 photos, en production)
Vu par Mathias : « Composition impossible : aucune répartition des doubles (60) », toutes les vignettes « À écarter », la question du
nombre de pages. Vérifié dans le code : `[id]/lireLesPhotosClient.ts` avalait tout échec de chargement (`bitmap` → null) et laissait la
case BLANCHE mais numérotée, payée ; l'éditeur ne relisait JAMAIS ses adresses signées (`adressesEncoreValables` ne servait qu'à l'export),
qui périment après une à deux heures ; la lecture fausse était gardée ; `trame.ts` jetait pour toute taille infaisable (et 164 photos
en « tout garder » n'avaient AUCUNE taille possible : 4 chapitres de 41 photos, 12 doubles au plus par chapitre) ; `selection.ts`
ignorait les coups de cœur et les gardées de l'atelier. Branche `fix/composer-dossier-reel` :
- M-13 : adresses relues avant une lecture, chaque image essayée à toutes ses tailles puis réessayée après une relecture forcée ; une
  illisible est retirée de la planche ; au-delà de 10 % on s'arrête AVANT de payer (« 37 photos ne se chargent pas. Recharge la page,
  puis relance. » + « Réessayer ») ; lecture douteuse (plus de la moitié « à écarter », ou une planche de 8 et plus au même verdict) non
  utilisée, « Relire N photos · ≈ X $ » proposé ; les marques de l'atelier priment (jamais écartées, jamais en réserve, gardées dans le tri).
- M-14 : la taille faisable la plus proche, dite ; une phrase d'atelier (cause comptée, geste) quand il n'y a rien à composer ; tous les
  `throw` du compositeur sont des `ImpasseComposition`, l'écran ne passe que par `composerSur`.
- M-15 : plus de question sur la taille ; « la machine propose » (le nombre commandé, sinon tout garder) ; le bandeau offre « Plus court »,
  « Tout garder », « Commandé » avec leurs vrais chiffres, un clic recompose.
- Recette du 18/11 : page 1 sans repère vide, « View » jamais en chapitre, raisons en mots d'atelier.

## 18/11 : le compositeur v2 (définition v2, décisions M-16 à M-28)
Branche `feat/compositeur-v2` (poussée, PAS de PR, PAS de fusion : Mathias juge d'abord la planche de tests, hors git dans
`design-explorations/tunnel-2026-11-17/tests-v2/`). Fait : cinq notes lisibles, cinq causes fermées d'écarter, réserve avec raison, sans
date par ressemblance, séries sur l'empreinte, table de décision du nombre de photos par double (M-28), rythme, paires, petite entorse,
écho ou contraste, titres de la décision 9 (réglage `lieux`), comptage exact, corrections qui priment, paramètres par profil en données ;
planche B6 et lecture v4 (demandées à la prochaine lecture) ; passe de complément au banc (0,276 $) ; rejeu en matrice ; harnais v2.
Reste : trancher à l'œil « serrée » ou « avant » (M-16) et « lieux partout ou aux chapitres » (M-24) ; brancher la v2 à l'écran
(cinq notes, réglages, lancement seul après l'Analyse) ; regard fin du complément et classement des couvertures dans l'éditeur ;
grande entorse ; la pose sur des doubles plus denses (bandes coupées).

## Ce qui reste
- L'essai de Mathias sur une création libre, puis sur un dossier (`MEP_LECTURE_IA_CLIENTS=1`).
- Un premier appel RÉEL des étapes voyage et lieux depuis l'éditeur (la recette les a simulés) ; mesurer leur coût réel.
- Le raccord au registre des règles (T-216) : citer les règles par leur objet au lieu de chaînes.
- Les limites du moteur (gabarits 21:9, ouverture à plusieurs photos, couverture panoramique, filtres) restent hors de ce lot.
