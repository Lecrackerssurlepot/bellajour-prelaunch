# Le tunnel de l'éditeur : la définition v2

Version du 18/11/2026, après les décisions de Mathias sur les douze points (`RETOURS-MATHIAS.md`, M-16 à M-28). Elle généralise le rapport
du banc (`design-explorations/tunnel-2026-11-17/definition/RAPPORT.md`, hors git) : **aucun exemple nommé d'un projet** (M-01). Les règles
en données sont au registre (`src/lib/mise-en-page/regles/`, `definitionV2.ts`), lisibles dans `REGISTRE.md` (généré). Le code : le
compositeur v2 (`src/lib/mise-en-page/compositeur/`, réglages `ReglagesV2`, seuils `REGLES_V2` de `reglagesCompositeur.ts`).
Les chiffres marqués RD sont des réglages de départ, jamais des faits.

## 0. Combien de photos sur une double, et pourquoi (M-28)

La densité n'est pas un curseur : c'est une décision par double, prise par cette table (`compositeur/densite.ts`, `TABLE_DENSITE`,
`nombreVoulu`). Le découpage cherche les coupures qui s'en écartent le moins, sous les règles de rythme. Chaque double posée dit
« N photos ici parce que… » et cite ses règles. **À corriger ligne par ligne.**

| Règle | Si… | Alors… | Pourquoi | Exception |
|---|---|---|---|---|
| N-44 | toujours | 9 photos au plus sur une double ; 12 en série voulue (planche-contact, photomaton) | décision 8 | le profil festif monte le plafond de série |
| N-45 | une photo de la double montre des personnes | 6 photos au plus (4 sur une page) | M-08 : 70 mm de côté et 100 cm² chacune | aucune |
| N-46 | les formats des photos | très larges NON RECADRABLES : 6 au plus, en bandes (deux ou trois par page, seules sur leur page, jamais une seule) ; verticales seules : 8 ; formats mêlés : 7 ; une page sans très large : 6 au plus | une très large prend une bande, une verticale une colonne | v2.1 : une très large RECADRABLE (sa zone importante tient dans une demi-page, N-55) compte comme une photo de format libre |
| N-46b | une photo n'a pas la définition d'une demi-page | jamais seule : 2 photos au moins | une photo faible en pixels ne peut pas être grande | aucune |
| N-49 | une BELLE photo (note image forte, définition de la pleine page ou 150 ppp en double sans visage, aucun défaut, un point d'accroche pour un paysage) ou un coup de cœur | dans le dixième le plus fort : seule (1 photo), jamais dans une double dense ; sinon à deux ; v2.1 : une belle verticale va à deux (pleine et encadrée) pour ne jamais laisser la page d'en face vide | une belle photo n'est jamais noyée | le dixième le plus fort du lot ne sort jamais pour la taille |
| N-59 | une ou deux photos dont aucune ne tient une page | coûte autant qu'un défaut grave (v2.1) ; une page à moins de 30 % sans texte écrit est une faute DURE, même colorée | M-07 redevenue dure | une page de titre (ouverture) tient par son texte |
| N-23 | le sommet (la plus belle très large entre 55 et 85 % du livre) | 1 photo, la double entière | S-053 | sans belle très large, pas de sommet imposé |
| N-48 | les photos gardées du moment | voulu = densité visée × √(photos du moment ÷ photos d'un moment ordinaire), borné par N-44 à N-46 | on photographie plus quand ça compte : une période chargée n'est jamais étalée en doubles vides | N-49 et N-23 priment |
| N-47 | le rythme | jamais trois doubles denses (6 et plus) d'affilée (interdit) ; une cinquième double chargée (3 et plus) de suite coûte ; un chapitre sans double de 3 photos et plus coûte | Notion Mai, S-051, S-087 | la respiration est voulue, pas forcée (forcée, elle posait des photos seules trop petites) |
| N-50 | une paire (pancarte + sujet, portrait + ambiance, large + détail) ou une série | indivisible : la couper coûte ; un détail n'est jamais seul | la pancarte nomme, la photo montre | une coupure reste permise si rien d'autre ne tient |
| N-48b | le profil et l'ambiance | densité visée = milieu de la fourchette du profil ; sobre : un demi-cran plus bas ; stylisée : un demi-cran plus haut | M-06 | aucune |
| N-47b | la taille (décision 1, réglage « serrée ») | si les bonnes photos ne tiennent pas, la densité monte jusqu'au plafond du profil (moyenne sur toutes les doubles) AVANT toute réserve « pas de place » | M-16 | réglage « avant » : 2,9 photos par double, le reste en réserve |

## 0 bis. Le recadrage : ce qu'on coupe, pas combien (M-29, v2.1)

Réglage `recadrage` : « aucun » (la v2 d'avant : une 21:9 ne perd jamais plus de 45 %), « prudent » (le défaut d'un profil sobre), « normal »,
« franc ». Code : `compositeur/recadrageV2.ts`, la pose (`pose.ts`) et le contrôle (`controle.ts`).

| Règle | Si… | Alors… | Réglages (prudent / normal / franc) |
|---|---|---|---|
| N-55 | toujours | la zone importante = la plus petite bande de colonnes et de lignes qui porte la part voulue de la chaleur AU-DESSUS de la médiane de la photo (le fond uniforme ne vote pas), réunie aux visages et aux corps ; plus de l'air, et davantage du côté où la personne regarde. Le recadrage est permis quelle que soit la surface retirée si cette zone tient entière dans le cadre. Le cœur (sans air) entamé de plus de 10 % : faute dure | chaleur gardée 85 / 75 / 65 % ; air 8 / 5 / 3 % ; air du regard + 12 / 10 / 8 % |
| N-55 | une très large dont la zone tient dans un cadre de demi-page (rapport 1,45) | elle est « recadrable » : la table la compte comme une photo de format libre | |
| N-56 | après recadrage | jamais sous 150 ppp ; un resserrement seulement à 200 ppp | |
| N-57 | une très large dont la chaleur est étalée sur toute la largeur (fenêtre ≥ 95 % de celle d'une chaleur uniforme, ou ≥ 85 % de la largeur), ou des visages sur 60 % de la largeur | tout le cadre compte : sa zone est la largeur entière ; elle se rogne en hauteur seulement ; plus de 10 % de largeur perdue : faute dure | |
| N-58 | le sujet couvre moins d'une part réglée de la photo | resserrer sur lui est PROPOSÉ (gardé seulement si rien n'y perd) | jamais / sous 12 % jusqu'à × 1,25 / sous 20 % jusqu'à × 1,6 |
| N-59 | une page à moins de 30 % sans texte écrit | faute dure, même colorée (M-07 dure) | |

Ce que le banc a montré le 18/11 (projet de test, 48 pages) : avec la même règle de mesure, la v2 d'avant entamait le cœur de la zone de
27 photos et recadrait 35 photos de plus de 25 % (jusqu'à 85 %) sans le dire ; la v2.1 « normal » en entame 12 (et les dit toutes en
faute dure) et en recadre 25 (jusqu'à 69 %). Seules 21 très larges sur 101 sont recadrables : sur ce lot, la chaleur des côtes et des ciels
est étalée, et pour 41 photos tout le cadre compte. La densité n'en est donc pas changée.

## 1. Les cinq notes (M-20, N-40)

Chaque note va de 0 à 1 et s'affiche en mots sur quatre crans **pris dans le lot** (quarts), jamais en absolu. Chacune a sa phrase.

| Note | Ce qu'elle dit | Ce qui la fait |
|---|---|---|
| Technique | « elle s'imprime bien » | netteté du sujet rapportée à la médiane du lot, définition en pleine page, image de messagerie, floue |
| Histoire | « elle compte pour le récit » | intérêt lu, un lieu lu, une action, un groupe posé (un jalon) |
| Image | « elle tient seule, en grand » | force d'image lue (sinon l'intérêt), lumière dorée, zone calme, point d'accroche ; moins : yeux fermés, grimace ; coup de cœur |
| Gens | « on y voit les nôtres » | nombre exact de personnes, taille du plus grand visage, rire ou sourire, groupe complet, pris sur le vif |
| Unicité | « on n'a rien d'autre de ce moment » | seule trace du moment, distance d'empreinte à la plus proche du moment, taille du moment |

Une borne n'est pas une note : la **taille possible** (définition) plafonne tout.
- En réserve « faible » seulement si la technique est faible **et** que ni l'histoire, ni les gens, ni l'unicité ne sont bonnes.
- Le héros d'un moment : la meilleure image, puis les gens, puis l'histoire.
- L'ordre de sortie, quand la taille manque : l'unicité la plus basse, puis l'histoire ; une photo de gens sort en dernier ; jamais la seule
  trace d'un moment, une photo gardée, un coup de cœur, ni le dixième le plus fort en image.

## 2. Écarter, réserver (M-17, M-18, M-19)

- **Écarter** : cinq causes fermées, rien d'autre (`CAUSES_ECART`) : doublon exact ; floue sans aucun sujet net (ni visage, ni zone
  importante) ; inimprimable même en vignette de 40 mm (100 ppp, RD) ; hors sujet (un document que la lecture juge à écarter) ; le geste de
  l'atelier.
- **Réserve**, avec sa raison en mots : presque identique (empreinte à 8 bits ou moins, prises à 2 minutes au plus) ; faible (voir les
  notes) ; l'IA la juge faible, à confirmer (jamais si les gens sont bons ou si c'est la seule trace du moment) ; floue mais on y voit un
  sujet, à l'œil ; sortie par l'atelier ; bonne photo sans place (seulement après N-47b).
- **Sans date** : placée par ressemblance (numéro de galerie, couleurs, chapitre lu), « à vérifier » ; jamais en réserve pour un rangement.
- **Séries** : les quasi-identiques gardent l'élue ; les photos assez différentes restent toutes, en série typée (action, photomaton,
  angles), qui reste ensemble.

## 3. La structure

- Chapitres : le thème de l'album découpe et nomme (inchangé, M-05, N-32).
- Petite entorse (M-22, N-52) : une pancarte ou un détail rejoint son sujet de la même journée, une heure d'écart au plus, quatre places au
  plus ; le chapitre ne change jamais ; rien n'est signalé dans le magazine.
- Grande entorse : une page titrée qui rassemble au moins 4 photos de jours différents autour d'un motif ; 1, 2 ou 3 selon le réglage.
  Écrite, pas encore produite par le compositeur.
- Écho ou contraste (N-51) : les deux moitiés d'une double se répondent (écart de couleur des dominantes faible = écho ; fort, ou plans
  opposés = contraste) ; ni l'un ni l'autre coûte.

## 4. Les textes (M-24, N-53)

Titre d'ouverture ; légende d'un lieu lu sûr ; texte ou couleur sur une page trop vide (M-07) ; un titre pour un lieu nouveau ou un jour
fort (un des 20 % de jours les plus photographiés), jamais sur une double de plus de 5 photos. Réglage `lieux` : « chapitres » (les lieux
ne nomment que les chapitres), « nouveaux » (la décision 9, par défaut), « partout » (plus une légende de lieu sur chaque double qui en a
un). **Question ouverte à Mathias : « Les lieux : aux chapitres seulement, ou partout ? »** Le titre du client passe avant le pays et le nom
du projet (le seul texte qu'on n'invente pas).

## 5. Les questions (M-25)

Au client, trois, toutes facultatives, dans le ton du questionnaire de /composer : « Combien étiez-vous ? », « Les lieux ou les étapes à
ne pas oublier ? », « Vos photos préférées ? » (`QUESTIONS_CLIENT`). Jamais redemandé : l'occasion (« Quel était ce moment ? », elle aide
à deviner le thème, N-54), l'histoire, le titre. À l'atelier : thème, ambiance, moment fort, lieux à ne pas montrer, pré-remplis.

## 6. Les tags (M-26)

La planche lit aussi, depuis le 18/11 (planche B6, lecture IA version 4) : nombre exact de personnes (0 à 6, 7 et plus), animal ou
document, force d'image, posé ou spontané, geste, insolite. Une lecture ancienne reste lisible ; **un champ absent n'est jamais un zéro**
(sans « personnes », le compte vient des visages). Le regard fin du banc lit en plus l'expression, les yeux fermés, le point d'accroche et la
direction du regard, et un classement des candidates couverture : ces quatre tags et ce classement ne sont pas encore demandés par
l'éditeur (le banc seulement).

## 7. Les corrections (M-27)

Tags corrigés, marques (coup de cœur, gardée, écartée, sortie), réponses : gardées à part (`CorrectionsAtelier`), appliquées AVANT la
machine (`appliquerCorrections`), jamais écrites dans la lecture.

## 8. Les paramètres par profil

Portés en données (`PARAMETRES_PROFIL`) : densité moyenne visée, plafond avant réserve (D1, neuf, NON MESURÉ), part de pleines pages,
plafonds de double et de série. Les règles ne changent pas d'un profil à l'autre (M-01).

| Profil | Photos par double | Plafond avant réserve | Pleines pages | Plafond série |
|---|---|---|---|---|
| long voyage en famille | 2,5 à 3,2 | 4,5 | 25 à 35 % | 12 |
| vacances festives | 3 à 5 | 6 | 10 à 15 % | 16 |
| couple | 2 à 3 | 3,5 | 40 à 55 % | 9 |
| événement d'un jour | 3 à 4 | 5 | 20 à 30 % | 12 |
| année de vie | 2 à 3 | 4 | 35 à 50 % | 9 |
| séjour court | 2,5 à 3 | 4 | 30 à 40 % | 9 |

## 9. Le rejeu sans IA

`scripts/compositeur-rejeu.ts <banc> <projet> <sortie> --matrice <matrice.json>` compose toute une liste de variantes (version, taille,
réglages, réponses, corrections) à coût nul à partir des lectures gardées ; `--reglages` et `--reponses` pour une seule. Sortie par
variante : planche-contact, magazine.pdf (épreuve à l'œil), « Posées et laissées » ; puis une comparaison de toutes les variantes.

## 10. Ce qui n'est pas prouvé

- Les plafonds de densité sont neufs. Sur un lot fait surtout de photos très larges, la double ne tient que six bandes : le plafond du
  profil n'est pas atteint, et le gain de photos posées est plus faible que le calcul de la définition.
- Les tags de force d'image, d'expression et de point d'accroche sont des avis du modèle, non confrontés aux coups de cœur.
- Les rafales et les grandes entorses n'ont pas de cas réel dans les lots joués.
- La pose (choix du gabarit) n'a pas changé : les fautes qu'elle commet sur des doubles plus denses viennent d'elle (bandes coupées,
  personnes en bande fine) et sont dites par le contrôle.
