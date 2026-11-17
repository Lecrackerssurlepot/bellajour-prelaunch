# Les règles réellement codées dans le compositeur (17/11)

Code : `decider.py` (sélection, trame), `poser/pose.ts` (poseur de la démo du 13/11 rebranché sur la copie à jour
`.claude/worktrees/agent-ac36d9c9ee1760b5c`, patché), `mesurer.ts` (contrôle), `passe.sh` (une passe). Corrections à l'œil :
`corrections-oeil.json` (ce n'est pas une donnée de la machine, voir N-01).

## 1. Règles des artistes codées

| Id | Énoncé court | Où |
|---|---|---|
| S-001 | intérêt = IA + récit + image − défauts | `decider.py` `score` |
| S-002 / S-008 | des gens (« nous ») et les groupes montent | `score` |
| S-004 | pleine page ≥ 200 dpi | `plein_def` |
| S-009 | chaque moment garde sa meilleure (au-dessus de 0,4) | tri par chapitre |
| S-010 | détail serré faible descend | `score` |
| S-012 / S-048 / S-134 | un lieu lu sur un panneau, jamais une enseigne, jamais inventé | `LIEUX_AFFICHES`, `MARQUES`, légendes N-02 |
| S-013 | une œuvre jamais en grand (liste à l'œil) | réserve `oeuvre` |
| S-017 | trop petite pour imprimer → réserve | entonnoir |
| S-020 / S-023 | doublon, floue → écartées | entonnoir |
| S-022 | image de messagerie : petite, descend | `score`, recettes (`tient_double`, `plein_def`) |
| S-025 / S-026 | « à écarter » de l'IA → réserve ; rien n'est supprimé | entonnoir, `selection.json` |
| S-027 / S-034 | presque pareilles (≤ 120 s, même format, même sujet) → la meilleure | entonnoir |
| S-046 / S-093 | un héros par double | `roles_satellites` |
| S-049 / S-050 | page 1 = la plus forte des trois premiers moments | page 1 |
| S-055 | dernière page = des gens du dernier tiers | dernière page |
| S-057 / S-124 | période en page 1 et en couverture, pas en dernière page | textes |
| S-059 / S-060 | ouverture de chapitre titrée, à 1 ou 2 photos (coût sinon) | `decouper` |
| S-064 | 2 à 8 doubles par chapitre | répartition conjointe |
| S-066 | même taux de tri dans chaque chapitre (41 à 53 % en passe 4) | tri par chapitre |
| S-069 | coût d'une double qui coupe un moment | `decouper` |
| S-073 | ordre = date de prise, jamais le rang de dépôt | `tri_chrono` |
| S-087 / S-091 | rythme grande / moyenne / dense (coût des répétitions de classe) | `decouper` |
| S-094 | grilles égales de même format (bandes) | recettes `bandes_et_bandes` |
| S-095 | part de pleines pages contrôlée (P1 : 25 à 35 %) | `mesurer.ts` |
| S-098 | une 21:9 jamais coupée de plus de 45 % (dur) | `pose.ts` `PERTE_MAX_LARGE`, `mesurer.ts` |
| S-105 / S-109 / S-113 | une 21:9 forte et ≥ 150 dpi tient la double | recette `pano` |
| S-107 / S-112 | pleine et bandes ; deux pleines | recettes |
| S-115 à S-121 | couverture : vraie photo, nette, tient la page, titre dans le calme, 4e qui répond | couvertures, poseur P-19 |
| S-119 | la scène d'une couverture (± 5 min) ne revient pas à l'intérieur | couvertures |
| S-133 | une photo sans date se range à côté de sa voisine dans la liste de l'IA | `ancre` |
| D-TAI-01 / R-I-44 | taille « normal » et taux gardé | `pages_normal` |
| C-025 / C-060 | aplat clair sur une ouverture sur deux | `fond` des ouvertures paires |
| D30 | un texte = un fait (titre du dossier, pays, nom de chapitre, dates EXIF, lieu lu sûr) | `faits` de la trame, contrôle `mesurer.ts` |
| D29 | aucune identité : on compte les visages | visages = boîtes, jamais comparées |
| P-01 à P4-03 | toutes les règles du poseur de la démo | `poser/pose.ts` (inchangé hors patches ci-dessous) |

## 2. Règles des artistes NON codées, et pourquoi

| Id | Pourquoi |
|---|---|
| S-003 (netteté dans la boîte du visage) | le tunnel donne la netteté du sujet, pas celle de chaque visage |
| S-005, S-014, S-035 (yeux fermés, selfie déformé) | donnée absente (expressions non lues) |
| S-021, S-024, S-126 à S-130 (photographe, écran, captures) | donnée PROV absente (provenance) ; la carte du vol est passée par le score |
| S-028 à S-031, S-036 à S-038 (séquences, pellicules) | le tunnel ne trouve aucune rafale chez Joëlle |
| S-039 à S-044 (détail + grand angle, couleurs du couple) | pas de GPS ; les palettes ne sont pas comparées par double (à faire) |
| S-053 / S-054 (sommet entre 45 et 80 %) | non forcé : les pleines doubles tombent aux doubles 3 et 19 |
| S-061 / S-062 (sommaire, générique) | l'éditeur n'a ni sommaire ni générique |
| S-074 à S-083 (coupures par thème) | aucune coupure jouée ; seule N-04 avance une photo dans son chapitre |
| S-084 / S-085 (journée en vrac, l'heure comme texte) | le 24/11 (21 photos) n'a pas eu sa signature SG-04 : à essayer |
| S-104 (signatures) | posées par le poseur quand elles gagnent (SG-01, SG-02, SG-06, SG-07), pas voulues par la trame |
| S-110 (5 mm du bord rogné) | le recadrage de l'éditeur le gère sans contrôle dédié |
| S-123 (couverture à plat 1re + 4e) | **le moteur n'a aucun gabarit de couverture panoramique** : remplacé par CV-09 |
| C-047, C-048, C-058 (accords par double) | une seule teinte d'aplat posée (aplat clair) ; pas de choix par double |
| F14 « Film doux » | **l'éditeur n'a pas de filtres** : noté dans `trame.style.raison`, rien n'est appliqué aux pixels |
| T-xx autres paires | consigne : T-13 Alegreya + Alegreya Sans pour cette campagne |

## 3. Règles nouvelles nées des critiques (N-…)

| Id | Énoncé | Né de | Où |
|---|---|---|---|
| N-01 | une image de messagerie n'a qu'une date de RÉCEPTION (numéro de galerie) ; les chapitres démentis à l'œil sont corrigés, les autres signalés douteux | passe 1, doubles 2 et 8 | `corrections-oeil.json`, `charger` |
| N-02 | un lieu lu sur un panneau légende une AUTRE photo de la même double prise à ± 45 min, jamais le panneau lui-même | conception | `decider.py` |
| N-03 | « The Boatshed » traité comme une enseigne (nom de commerce), jamais en texte | conception (décision seul) | `MARQUES` |
| N-04 | l'ouverture d'un chapitre peut prendre la plus forte de son premier tiers | passe 0 (essai) | `options_ouverture` |
| N-05 | une ouverture n'est jamais « deux pleines » (le titre n'y tient pas) | passe 1, double 21 | `recettes` |
| N-07 | pas de légende de lieu sur une double de 6 photos et plus | passe 1, double 16 | `decider.py` |
| N-08 | couvertures classées d'abord par le type que veut le profil (P1 : un lieu avec des gens) | passe 1, couvertures | `decider.py` |
| N-09 | la dernière page préfère nettement une verticale qui tient la page | passe 1 | `decider.py` |
| N-10 | une photo au chapitre douteux ne va pas à l'intérieur (réserve) | passe 1, doubles 2 et 23 | entonnoir |
| N-11 / N-11 bis | lot à 89 % de 21:9 : la page « trois bandes » peut revenir jusqu'à 25 % des planches, seule la planche voisine l'interdit | passes 1 et 3 | `pose.ts` `PART_MAX`, `FENETRE` |
| N-12 | jamais quatre 21:9 sur une page | passe 2, double 23 | `COUT_U` |
| N-13 | une double hors ouverture va à fond perdu (« de grandes photos à mettre en valeur ») | passe 2, doubles 3 et 20 | `fond_perdu`, `pose.ts` |
| N-14 | 21:9 et verticales mêlées à 2-3 photos, ou messagerie en gabarit libre : coût fort | passes 2 et 3 | `recettes` |
| N-15 | une image de messagerie descend de 0,12 | passe 3, double 23 | `score` |
| N-16 (écrite, non jouée) | une légende de lieu seulement sur une recette qui laisse une marge de texte | passe 4, double 22 | — |
| N-17 (écrite, non jouée) | une série 3 + 3 bandes porte `repetition_voulue` (S-103) | passe 4, double 20 | — |
| N-18 (écrite, non jouée) | la vignette de 4e se prend parmi les gens dont aucun visage ne touche le bord | passe 4, couverture « paysage » | — |

## 4. Réglages provisoires à trancher par Mathias
- 150 dpi accepté en pleine double (118 et 042 à 155 dpi, signalés à chaque passe).
- 48 pages : aucune commande ne couvre tout le voyage ; le multiple de 4 qui donne 3,1 photos par double avec le taux de R-I-44.

## 5. Passes 5 à 7 : les dix règles du DA (jugement du 17/11, `sorties/joelle/compo/passe-4/jugement-da.md`)

| Règle DA | Codée où | Contrôle (`mesurer.ts`, `regles_da`) | État en passe 7 |
|---|---|---|---|
| DA-1 une seule forme d'ouverture (pleine page + nom en géant + dates), une couleur de titre | `decider.py` étape 5 (`gabarit: "SG-06"`, la verticale la plus forte du chapitre) ; `pose.ts` (`force`, N-21 le cadre géant) | une seule forme, une seule couleur | tenue : SG-06 × 7, accent ocre |
| DA-2 jamais plus de 2 doubles sans fond perdu (S-097) | `decouper` : état « doubles sans fond perdu » ≤ 2 | plus longue suite sans fond perdu | tenue : 1 |
| DA-3 aucun corps à 15 mm du pli | `charger` (silhouettes, zone importante si l'IA voit des gens sans visage) ; `pose.ts` `MARGE_PLI_CORPS` | `corps_pli` | tenue : 0 |
| DA-4 plancher 0,55 tant que la réserve a 0,70 | `decider.py` étape 4 (échange, puis sortie sans remplaçante) | photo < 0,55 posée avec mieux en réserve | tenue : 0 (130 gardée à l'œil, 014 dans l'itinéraire) |
| DA-5 pas de trou blanc | `pose.ts` `trouEnveloppe` (coût) ; seuil proposé : rectangle vide ≥ 12 % × 25 % dans l'enveloppe, page imprimée ≥ 40 % | idem | **3 pages sous 40 %** (doubles 5, 10, 20) |
| DA-6 jamais deux fois la même scène | entonnoir : ≤ 5 min, même sujet, même plan, même format (N-19 : le dhash ne départage rien) | idem sur la double et la voisine | tenue : 0 |
| DA-7 un gabarit ≤ 4 fois, deux voisines jamais identiques | `pose.ts` `MAX_FOIS`, voisine = planche ± 1 ; ouvertures voulues et pleines pages seules hors compte (P2-01) | idem | tenue : 3 au plus |
| DA-8 légendes hors photo, titre de lieu seulement s'il est sûr | `pose.ts` (jamais une légende dans une photo, corps ≥ 8) ; titre = ville lue ≥ 2 fois (« Sydney ») ; légendes facultatives | légende dans une photo, corps < 7,5 | tenue (2 légendes sans place, facultatives) |
| DA-9 rythme P1, sommet 60-70 %, alternance | coût dense −1, sommet seul (N-23) choisi dans la fenêtre 55-85 %, répartition qui rapproche le sommet de 65 % | parts, position | **hors cible** : 9/23 à une photo (39 %), 3/23 denses (13 %), sommet à 0,79 |
| DA-10 la couleur vient de la photo | titres et dates d'ouverture à l'accent ocre ; aplats C-047 (`teinte_de` : la couleur franche de la photo voisine, L 90, chroma × 0,35) | textes à l'accent, aplats pris dans une photo | tenue : 15 et 1 |
| Itinéraire (S-061) | `decider.py` : « 22 jours » + 7 lignes « n · titre · dates » + la carte du vol, aplat pris dans la carte | — | posé (planche 1) |

Règles nouvelles des passes 5 à 7 : **N-19** (même scène sans empreinte), **N-20** (la taille commandée reste 48 pages d'une passe à l'autre),
**N-21** (titre d'ouverture dans le cadre géant), **N-17 bis / N-22** (une série de bandes = une double), **N-18 bis** (vignette de 4e verticale),
**N-23** (le sommet seul), **N-24** (dernière page avant les couvertures). Écrites, non jouées : **N-25** (lignes de l'itinéraire en corps 14),
**N-26** (« pleine et bandes » exige trois bandes ou deux en pleine définition), **N-27** (quatre bandes = E-D9a/b, jamais un GD1),
**N-28** (une enseigne lue écarte une photo de la 1re de couverture).
Arbitrages pris seul : DA-1 l'emporte sur DA-7 pour les ouvertures (S-099) ; une pleine page seule n'est pas un « gabarit » au sens de DA-7 ;
DA-9 traité en signal (fourchettes du profil), pas en faute dure ; densité visée 2,9 (au lieu de 3,05) pour que 7 ouvertures + l'itinéraire tiennent dans 48 pages.
