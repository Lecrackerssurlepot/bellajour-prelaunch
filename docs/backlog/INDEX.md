# Backlog — ce qui reste

Un fichier par ticket dans ce dossier. Les tickets fermés partent dans `fermes/`.
Ordre de lecture : gravité, puis ce qui débloque le plus.

**Gravité** — `bloquant` : une cliente en subit l'effet, ou de l'argent/une donnée est en jeu.
`serieux` : ça nous coûtera avant le lancement. `confort` : dette, propreté, on ship sans.
**Autonomie** — `libre` : je fais. `avis-requis` : je prépare, Mathias tranche (mails, prix,
migrations en production, texte légal, impression, suppression de données).

**État** — cinq mots, pas un de plus :

| mot | ce qu'il veut dire |
|---|---|
| `nouveau` | ouvert, aucun code écrit. Le constat peut avoir été re-vérifié : c'est dit en clair. |
| `en cours` | du code est posé et déployé, la fiche nomme ce qui reste |
| `en pause` | traité jusqu'à un point d'arrêt VOULU — il attend un arbitrage, un asset ou du volume |
| `fermé` | fait, sans reste. **La fiche est dans `fermes/`.** |
| `refuse` | infirmé : le défaut n'existait pas. Preuve dans la fiche, elle aussi dans `fermes/`. |

Un ticket dont la fiche a une section « Ce qui a été fait » remplie n'est plus `nouveau` : c'est
exactement l'écart que la passe du 01/09/2026 a corrigé, sur 36 lignes.

Semé le 29/08/2026 par l'audit de structure. Tous les tickets ci-dessous sont **prouvés dans le
code** (chemin + ligne dans chaque fiche), aucun n'est une intuition.

## Où on en est (20/10/2026 : Audencia, la première vraie édition)

Le parcours complet a été relu sur main pour une édition de 80 personnes sur 8 bateaux. L'envoi
tient le mauvais réseau et l'iPhone depuis le 19/10 (T-192, PR #271, essai réel 324/324). Ce qui
manque est ouvert en T-193 à T-202. **Avant de remettre l'espace à Audencia** : T-193 (le lot par
bateau), T-194 (photos au coffre non confirmées), T-195 (plafond total vide), T-196 (régénérer
coupe les liens), un essai sur de vrais téléphones (T-155), et les décisions de Mathias : T-200
(vidéos), T-202 (sauvegardes et plans), T-158 et T-159 (confidentialité, conservation).
Explication et schémas pour Mathias : l'artefact « Édition collective en clair » du 20/10.

## Où on en est (19/10/2026 : l'Édition collective en ligne, audits de sécurité et de performance)

L'Édition collective est ouverte en production depuis le 17/10 ; les 7 éditions d'essai sont
archivées, aucun vrai client encore. Le 19/10, deux audits (lecture seule, constats revérifiés
dans le code) : **une faille grave, corrigée le jour même** (T-161, l'atelier s'ouvrait sans mot
de passe), et 16 tickets ouverts (T-162 à T-177), plus ceux de la liste « avant un vrai client »
(T-157 à T-160). L'ordre proposé :

1. **Sécurité, tout de suite** : T-162 (mettre à jour Next.js, failles publiques), T-163 (en-têtes).
2. **Avant la première vraie édition** : T-167 (au-delà de 1 000 photos), T-172 (mur des styles trop lourd), T-158 et T-159
   (confidentialité et durée de conservation : Mathias tranche), T-160 (pannes invisibles).
3. **Avant d'ouvrir `COLLECTIF_MAILS`** : T-164 (origine des liens), T-166 (frein de
   « Retrouver »), puis T-146 et T-154.
4. **Avant les grosses éditions** : T-168, T-169, T-170, T-155 (essai réel).
5. **Confort** : T-165, T-171, T-173 à T-177.

Les retours d'expérience de Mathias après son premier test (19/10) s'intercalent en 2 :
T-179 à T-188, chacun avec sa planche dans le canevas du 19/10
(https://claude.ai/artifact/C4s2QmaRb1GN389a85i3Zd, copie dans
`docs/produit/collectif/maquettes/propositions-19-10/`). Rien n'est codé :
**les huit planches sont validées telles quelles le 19/10**, ses questions tranchées sur mes
recommandations (D25), et **toutes LIVRÉES le jour même** (PR #258 à #263, en production) :
T-179 à T-182 et T-185 à T-188 sont en recette chez Mathias. `COLLECTIF_MAILS` reste fermé
jusqu'à son accord. Restent ouverts : T-184 (l'accord des participants, migration), T-183 (en
pause, à observer).
T-184 (l'accord des participants non enregistré) est le seul trouvé en chemin : **codé le soir
du 19/10** (refus sans accord, version et heure écrites avec chaque photo), PR en attente de la
migration `20261020_collectif_accord_participant.sql`, que Mathias applique AVANT la fusion.

## Où on en est (16/09/2026 : le modèle de prix v3)

**La grille est hors taxes, la livraison a ses zones, le client peut commander plusieurs
exemplaires — sur une branche, en attente de deux migrations.** Le tableur « Prix & Marge v3 » de
Mathias (15/09), validé par Louis, est intégré sur `feat/prix-ht-zones-exemplaires` : grille HT de
24 à 60 pages (l'agrafé disparaît), TTC = HT × TVA du pays arrondi à l'euro (le pays revient à
l'écran 4), zones de port A 5 € / B 13 € / C au devis, offerte dès 50 €, 1 à 10 exemplaires (2e
−30 %, suivants −50 %), États-Unis et Brésil ouverts, Royaume-Uni à 20 %, papier gloss, PR #131
(finition) embarquée. CGV v4.0 FR/PT/EN, page `/livraison`, remboursement v3.1, mentions v1.1.
T-073 et T-106 fermés. **Bloquant chez Mathias avant la fusion** : appliquer
`20260911_atelier_finition.sql` ET `20260916_atelier_exemplaires_prix_ht.sql` (les écritures de
`finition` et de `quantite` ne se replient pas, volontairement). Le détail daté est dans
`docs/reference/ETAT-PRODUCTION.md`.

## Où on en est (11/09/2026, soir : la boîte du jour)

**T-112 fermé : la table de travail dit ce qui est entré et à qui est la balle.** Mathias :
« les nouvelles demandes ne sont pas claires, et on ne sait pas quand c'est à nous ». Trois
définitions de « nouveau » cohabitaient en tête de page, la colonne État disait un nom et jamais
un camp. Désormais : une boîte « Depuis hier » (une ligne par dossier, qui disparaît d'elle-même
quand on a joué, sans bouton par décision de Mathias), une colonne « Prochaine étape » (pastille
de camp + geste, même calcul que la pile), et les retards lus avec les à-faire sous « À nous ».
`urgence.ts` n'a pas bougé. La pile « Sans réponse » reste dans T-110.

## Où on en est (11/09/2026, fin de journée — les références produit)

**Les références d'impression sont arrêtées, et trois tickets tombent avec elles.** Mathias avait
la liste ; le relevé Cloudprinter du 11/09 l'a confirmée jusqu'à la référence (`finish_gloss` et
`cover_finish_matte` existent bien, avec leur asymétrie de nommage) et a chiffré ce qu'elle
coûte. Intérieur 130 g couché satiné, couverture 250 g, **pelliculage laissé au client**,
brillant ou mat, sans supplément — un demi-centime d'écart au devis, il n'y avait rien à
arbitrer. T-027 et T-077 sont fermés, le point bloquant de T-028 tombe, T-078 est débloqué.

Ce que le relevé a appris et qu'on ne devinait pas : le grammage ne coûte presque rien (un
centime entre 90 et 130 g), mais il décide de l'USINE, donc du PORT — 2,76 € HT d'écart en
France entre le silk et le gloss, et aucun écart au Portugal ni en Allemagne. Tout est dans
`docs/reference/SPECS-CLOUDPRINTER.md`.

⚠️ **La migration `20260911_atelier_finition.sql` doit être appliquée AVANT le déploiement.**
C'est la première du dépôt dont l'écriture NE SE REPLIE PAS, volontairement : un repli ferait
imprimer brillant à quelqu'un qui a cliqué mat, sans que personne ne le sache. La lecture, elle,
se replie partout.

## Où on en est (11/09/2026)

**T-109 fermé : on peut relancer un client depuis l'atelier.** Le bouton vit sur la ligne, armé
en deux temps, et la colonne « Dernier mot » a remplacé « Ouvert » (la date d'ouverture reste au
survol). Aucun template Brevo à créer, aucune migration : une relance manuelle rejoue le gabarit
du mail automatique correspondant et ne s'en distingue que par son code, qui porte le rang.
Seuils **tranchés par Mathias le 11/09** : deux relances au maximum par motif, soixante-douze
heures entre deux (`src/lib/atelier/relance.ts`).

**Ce qui reste de ce chantier** est dans T-110 (relance groupée, pile « Sans réponse », téléphone
sur la ligne, et surtout : le chemin d'envoi réel jamais exercé) et T-111 (la vitesse de la table
de travail, dont un quart est fait). Les deux écrans proposés et non retenus — la « piste II »,
liste et dossier en deux volets — sont dessinés dans le canevas du 11/09 :
`https://claude.ai/code/artifact/291e130a-6a30-4102-b615-8a87a41ca8d6`.

## Où on en est (10/09/2026, après le chantier « grille par pages »)

**Six PR le même jour (#99 → #103), trois tickets fermés (T-006, T-072, T-074), un ouvert (T-106, la politique de livraison), 34 encore ouverts,
aucun bloquant.** La grille finale de Mathias est en production (un prix par nombre de pages, 25 à
59 €), le prix se gèle sur le dossier, le pays est demandé à l'écran 4, la livraison est facturée
en sus par devis Cloudprinter, les CGV sont en v3.1. **Ce qui bloque maintenant est chez Mathias** :
la migration `20260910_atelier_prix_gele.sql` (sans elle, aucun aperçu ne peut être vendu), le
plafond de livraison, la règle HT → TTC du port, et la poussée des templates M3/M3b/M10 vers Brevo.
Le détail daté est dans `docs/reference/ETAT-PRODUCTION.md`.

## Où on en est (15/09/2026, soir : les modèles de couverture)

**Recompté fiche par fiche le 16/09 : 113 tickets ouverts depuis le début, 31 encore ouverts,
82 fermés, et AUCUN bloquant.** Sur les 35 : **30 attendent une décision de Mathias**,
5 sont marqués `libre`. Répartition : 27 `serieux`, 7 `confort`, 1 `mineur`.

**T-091 fermé, en production.** L'écran du titre montrait deux couvertures dessinées en CSS qui
ne servaient à rien. Il montre neuf modèles réels et choisissables, avec « aucune préférence »
toujours visible, et le choix remonte sur la fiche du dossier : l'atelier sait vers quoi viser
avant la première maquette. Migration `20260915` appliquée par Mathias et vérifiée.

Un mécanisme de **titre vivant** (le titre du client écrit en direct sur chaque couverture, à la
place, à la police et à la couleur relevées pixel à pixel) a été construit, il marchait, et
Mathias l'a débranché : la question de l'écran est « un style vous parle déjà ? », on demande de
reconnaître une ambiance, pas de se projeter dans une maquette. Il est archivé entier dans
`archive/titre-vivant-composer/`, README et marche à suivre compris. **Ne pas le réécrire.**

Le chantier des visuels a fermé T-069 et fait avancer T-085 (voir leurs lignes).

### Ce que disait le compte précédent (08/09/2026)

**105 tickets ouverts depuis le début, 37 encore ouverts, et AUCUN bloquant — pour de vrai.**
Le compteur en annonçait un depuis des jours : c'était T-002, dont la fiche disait elle-même
depuis le 31/08 qu'il sortait du rang des bloquants, sans que son en-tête suive. Corrigé.

Sur ces 37 : **34 attendent une décision de Mathias**, et les 3 marqués `libre` ne le sont pas
davantage — ils attendent un geste hors du dépôt (T-101, console Google), une référence
visuelle (T-080), ou un vrai iPhone pour être mesurés (T-062).

### Ce que le 08/09 a changé

Neuf tickets fermés (T-019, T-067, T-086, T-088, T-090, T-093, T-102, T-103, T-104), deux
ouverts et fermés le jour même, et deux marches livrées sur T-096.

**Le soir du 08/09**, la page produit sur téléphone a été refondue (onze objets au-dessus du
pli → sept, dix chiffres → quatre, plus aucun texte sous 14 px), l'espace compte a gagné un
bouton « nouveau numéro » et ses écrans d'attente, et **T-105** a été ouvert : recommander un
numéro déjà livré, structure posée et verrouillée en attendant le prix.

**Le fait marquant n'était pas au backlog.** En allant vérifier une image de mail en 404, on a
trouvé une fuite ouverte depuis le 01/09 : `/ambassadeurs` répondait 200 avec son formulaire,
il ajoutait à la liste Brevo 3, et cette liste déclenchait une automation **active** qui
envoyait deux mails annonçant des préventes closes. Coupé en trois endroits indépendants —
automation en pause, page en 410, les deux routes en 410.

**La leçon du jour, transposable :** un `grep` ne voit pas ce que les mails référencent. Les
templates Brevo appellent leurs images par URL absolue, et deux fichiers « non référencés »
étaient en fait vivants dans 18 et 3 templates actifs. Avant de déplacer une image de
`public/`, interroger Brevo — pas seulement le dépôt.

| id | titre | domaine | gravite | autonomie | etat |
|---|---|---|---|---|---|
| T-001 | Le numéro de suivi n'est jamais enregistré | donnees | bloquant | avis-requis | **fermé** |
| T-002 | Les liens de parrainage des mails vivants sont morts | contenu | serieux | avis-requis | en pause (31/08, stratégie dans `STRATEGIE-PARRAINAGE.md`) — **gravité corrigée le 08/09** : l'en-tête de la fiche disait encore `bloquant` alors qu'elle-même le sortait du rang depuis le 31/08, d'où un bloquant fantôme à chaque ouverture de séance. Le risque a encore baissé : W1 (410), P1/P2 (checkout 410) et la séquence Brevo (en pause) font qu'aucun lien cassé ne peut plus PARTIR |
| T-003 | 101 Mo d'images orphelines déployées à chaque build | front | serieux | libre | **fermé** (fiche dans `fermes/`) — fait le 02/09 : `prevente/` (dont 5 `.mp4`) et `solution/` déplacés en `archive/public-orphelins/`, `public/` de 22→9 Mo. Le « 101 Mo » était périmé (le gros avait déjà disparu). tsc+lint+build verts |
| T-004 | La page d'état de la cliente est indexable par Google | front | serieux | libre | **refuse** (31/08, le noindex existait déjà) |
| T-005 | L'ancien mot de passe admin partagé ouvre encore la porte | admin | serieux | libre | **fermé** |
| T-006 | Un album de 29 pages n'est couvert par aucune ligne des CGV | produit | serieux | avis-requis | **fermé** (10/09 : grille par page exacte, l'annexe des CGV dérive du code) |
| T-007 | Un mail sans template se saute en silence, à l'infini | atelier | serieux | libre | **fermé** |
| T-008 | Le rate-limit ne limite rien sur Vercel | paiement | serieux | libre | **fermé** (fiche dans `fermes/`) — 07/09 : frein posé sur `api/checkout` (la seule route payante sans), et la limite du procédé documentée dans le code. Le trou n'était pas exploitable : la route répond 410 depuis la fermeture des préventes |
| T-009 | Aucune page n'a de canonical | front | serieux | libre | **fermé** |
| T-010 | Rien ne vérifie le code avant un commit | exploitation | serieux | libre | **fermé** |
| T-011 | `.env.example` cache douze variables vivantes | exploitation | serieux | libre | **fermé** |
| T-012 | Trente `catch` muets sur des chemins qui écrivent | atelier | serieux | libre | **fermé** |
| T-013 | Les pages animées ignorent « réduire les animations » | front | confort | libre | **fermé** |
| T-014 | Le sitemap ment sur ses dates | front | confort | libre | **fermé** |
| T-015 | Deux modules morts traînent dans le code vivant | exploitation | confort | libre | **fermé** |
| T-016 | Les quatre composants de l'ancienne accueil ont fini leur office | front | confort | libre | **fermé** |
| T-017 | Le focus au clavier est invisible sur la moitié du site | front | confort | libre | **fermé** |
| T-018 | Trois fichiers sans rôle sont servis publiquement | exploitation | confort | libre | **fermé** |
| T-019 | La barre de l'accueil n'a pas son repli Android | front | confort | avis-requis | **fermé** (fiche dans `fermes/`) — 08/09 : repli posé. ⚠️ Le correctif « écrit d'avance » ne se recopiait PAS : `.pv-nav--flat` et `--bj-nav-android-bg` sont du monde crème, `.at-nav` du monde sombre — nouveau token `--c-nav-android-bg`. Piège de cascade attrapé à la mesure (même spécificité que `.is-stuck`, à poser après). Hors Android, rendu identique au bit près |
| T-020 | On ne saurait pas qu'une visiteuse décroche | exploitation | serieux | avis-requis | **actif le 02/09** — Web Analytics + Speed Insights activés, scripts servis en 200 sur la prod (vérifié). Masquage des tokens live |
| T-021 | Le crédit fondateur de 30 € est entièrement manuel | paiement | serieux | avis-requis | en cours — automatique depuis le 01/09, rattachement manuel possible depuis le 10/09 (fondateur sous un autre email), jamais éprouvé contre Stripe |
| T-022 | Les mails tombent dans l'onglet Promotions de Gmail | exploitation | serieux | avis-requis | en pause (31/08, tranché : la maquette reste telle quelle) |
| T-023 | 734 photos orphelines dorment sur R2 | donnees | confort | avis-requis | nouveau — doit ignorer les dossiers anonymisés (T-076) |
| T-024 | La page Santé crie sur une base vide | admin | confort | libre | **fermé** |
| T-025 | Cinq mails n'ont jamais été envoyés en vrai | atelier | serieux | avis-requis | nouveau |
| T-026 | Les CGV v3.0 n'ont pas été relues par un juriste | produit | serieux | avis-requis | **fermé** (10/09 : vérifiées, pas de relecture juridique, décision de Mathias) |
| T-027 | Les finitions d'impression sont posées par défaut, pas choisies | produit | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 11/09 : relevé des prix usine, Mathias tranche. Intérieur `pageblock_130mcs`, couverture `cover_250mcs`, pelliculage AU CHOIX du client (brillant ou mat, sans supplément). Le comparatif est dans `SPECS-CLOUDPRINTER.md` |
| T-028 | La page produit affirme un grammage qu'on n'a pas mesuré | produit | serieux | avis-requis | en cours — **le grammage est sourcé le 11/09** (T-027 fermé) : `/magazine` et les CGV v3.2 disent ce qu'`impression.ts` commande. « Livraison comprise » tranché le 10/09. Restent les visuels provisoires et la FAQ non relue |
| T-029 | Deux avertissements de lint traînent depuis le lot 7 | exploitation | confort | libre | **fermé** |
| T-030 | Vérifier si la couverture d'un seul tenant est déjà livrée | atelier | confort | libre | **refuse** (03/09 — déjà livré : `plat` en un fichier découpé à l'affichage, T2-2/T-089/T-090 ; preuve dans `fermes/`) |
| T-031 | Une erreur en production n'est vue par personne | exploitation | serieux | avis-requis | nouveau |
| T-032 | On n'a jamais vérifié qu'une sauvegarde se restaure | donnees | serieux | avis-requis | nouveau |
| T-033 | Aucun processus pour effacer les données d'une cliente | donnees | serieux | avis-requis | nouveau |
| T-034 | Aucun plan de retour arrière si un déploiement casse la vente | exploitation | confort | libre | **fermé** |
| T-035 | Le chemin qui encaisse n'a aucun filet automatique | paiement | serieux | libre | **fermé** (le reste → T-081) |
| T-036 | Un rebond « invalid » pourrait être ignoré en silence | atelier | serieux | libre | **fermé** |
| T-037 | Un signalement en spam est enregistré mais invisible | admin | serieux | libre | **fermé** |
| T-038 | Le webhook des rebonds dit oui à Brevo même quand il n'a rien écrit | atelier | serieux | libre | **fermé** |
| T-039 | Le webhook des rebonds n'écoute rien tant qu'il n'est pas branché | exploitation | serieux | avis-requis | **fermé** |
| T-040 | N'importe qui peut se déclarer ambassadeur à la place d'une cliente | paiement | bloquant | avis-requis | **fermé** |
| T-041 | La relève quotidienne écrit les tokens des clientes dans les logs | atelier | serieux | libre | **fermé** |
| T-042 | La vignette d'une photo supprimée reste dans le coffre | donnees | serieux | libre | **fermé** |
| T-043 | Une panne de base fait dire à la cliente que son dossier n'existe pas | atelier | serieux | libre | **fermé** |
| T-044 | Deux colonnes récentes n'ont pas le filet que toutes leurs voisines ont | donnees | serieux | libre | **fermé** (le reste → T-082) |
| T-045 | On peut savoir qui est cliente de Bellajour, avec son prénom | paiement | serieux | libre | **fermé** |
| T-046 | La porte de l'atelier se laisse tester à l'infini | admin | serieux | libre | **fermé** |
| T-047 | Un paiement sous alias n'attribuerait aucun numéro de fondateur | paiement | confort | avis-requis | nouveau |
| T-048 | La garantie « pas d'objet sans ligne » n'existe pas vraiment | donnees | confort | libre | **fermé** (fiche dans `fermes/`) — corrigé le 01/09 (`r2.supprimer` rend un booléen, la route garde la ligne sur échec R2 et renvoie 500). tsc+lint+build+harnais verts |
| T-049 | L'adresse de retour après paiement n'est pas vérifiée | paiement | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — corrigé le 02/09 : `originDeConfiance` (liste blanche + repli gracieux sur `SITE_URL`) sur `/api/atelier/checkout`. Même défaut DORMANT sur `/api/checkout` (prévente close) noté dans la fiche. tsc+lint+build verts |
| T-050 | Sans JavaScript, le site sert un écran noir — y compris la page qui fait payer | front | bloquant | libre | **fermé** |
| T-051 | Le questionnaire est muet pour qui n'utilise pas la souris | front | serieux | libre | **fermé** |
| T-052 | On refuse une histoire trop courte sans jamais dire qu'elle est trop courte | front | serieux | libre | **fermé** |
| T-053 | Les seuls libellés de l'écran des coordonnées sont illisibles | front | serieux | libre | **fermé** |
| T-054 | Une photo qui n'est pas partie ne se voit pas, et le bouton reste actif | front | serieux | libre | **fermé** |
| T-055 | La loupe laisse atteindre le bouton payer, invisible sous le fond noir | front | serieux | libre | **fermé** (reste à voir à l'œil : recette) |
| T-056 | La page qui suit le paiement se recharge cinq fois sans prévenir | front | serieux | libre | **fermé** (reste à voir à l'œil : recette) |
| T-057 | Les CGV portugaises, qui font foi, sont servies dans un document déclaré français | produit | serieux | libre | **fermé** (le reste → T-083) |
| T-058 | Un lien de reprise tronqué fait recommencer tout, et crée un second dossier | atelier | serieux | libre | **fermé** (le reste → T-084) |
| T-059 | Une police jamais peinte retarde l'apparition du premier écran | front | serieux | libre | **fermé** (fiche dans `fermes/`) — corrigé le 30/08 (commit `0a765a3`, italique sortie du layout), prouvé au build par l'audit du 01/09 |
| T-060 | 164 Ko d'images du deuxième écran descendent pendant que le premier s'affiche | front | serieux | libre | **fermé** |
| T-061 | Le chemin de fer fait saccader le téléphone alors qu'il n'y est pas affiché | front | serieux | libre | **fermé** (fiche dans `fermes/`) — corrigé le 30/08 (commit `0a765a3`, `matchMedia` miroir de la media query), prouvé par l'audit du 01/09 |
| T-062 | Le grain refond l'écran entier à chaque frame de défilement | front | serieux | libre | **en pause** (07/09) — le calque de grain est promu sur sa propre couche GPU (`translateZ(0)` + `will-change`), aspect identique vérifié. Les deux boucles rAF citées étaient déjà coupées hors écran depuis le 30/08. Le reste du coût est le `mix-blend-mode` lui-même : il ne se supprime pas sans changer l'aspect, et le gain en images par seconde demande un vrai iPhone pour être mesuré |
| T-063 | 62 % de la feuille servie sur tout le site vise des pages archivées | front | confort | libre | **refuse** (fiche dans `fermes/`, 07/09) — déjà fait avant cette séance : `globals.css` est passé de 10 332 à 5 211 octets, zéro sélecteur mort restant (vérifié par grep). Les deux règles vivantes portent leur justification en commentaire |
| T-064 | Trente déclarations de police jamais peintes bloquent le rendu de chaque page | front | confort | libre | **fermé** (fiche dans `fermes/`, 07/09, PR #78) — Cormorant sortie du layout racine vers les pages qui la peignent : le chunk racine passe de 30 à 21 `@font-face`, −7 180 octets sur `/`, `/magazine`, `/composer`, `/numero`. ⚠️ Piège trouvé en vérifiant : une propriété personnalisée fige sa substitution LÀ OÙ ELLE EST DÉCLARÉE — d'où `.bj-creme-fonts`, sans quoi tous les titres crème retombaient en silence sur DM Sans |
| T-065 | Aucune image du site n'a de variante pour téléphone | front | serieux | libre | **fermé** |
| T-066 | Ouvrir le questionnaire télécharge tout le moteur d'envoi de photos | front | serieux | libre | **fermé** (fiche dans `fermes/`) — fait le 02/09 : écrans 5 ET 6 en `next/dynamic` (l'écran 6 tirait aussi le moteur), moteur absent du chunk initial, worker servi en 200, reprise OK. Vérifié sur build prod. tsc+lint+build verts |
| T-067 | Une page indexable vend encore un programme qu'on n'honore plus | produit | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 08/09, tranché par Mathias : page de vente archivée, `/ambassadeurs` et `POST /api/ambassadeur/register` en **410**. ⚠️ `espace/` et `charte/` RESTENT, preuve à l'appui : les mails P3/A3 déjà partis y mènent (`DASHBOARD_URL`) et la charte engage jusqu'au 31/12/2026 |
| T-068 | Le site déclare deux fiches produit concurrentes pour un seul produit | front | serieux | libre | **fermé** (le reste → T-085) |
| T-069 | L'image de partage promet un album, et peut casser le déploiement entier | front | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 15/09 : la vignette est un FICHIER, une photo des dix magazines imprimés ; `opengraph-image.tsx` archivé, plus aucune police distante au build ; `/ambassadeurs` répond 410, ce point était sans objet |
| T-070 | Le retour des pages légales renvoie sur une page supprimée | front | confort | libre | **fermé** |
| T-071 | Personne ne serait prévenu si Google rejetait le site | exploitation | confort | avis-requis | nouveau |
| T-072 | Les prix finaux du magazine ne sont pas tranchés | paiement | serieux | avis-requis | **fermé** (10/09 : grille finale de Mathias dans `grille.ts`, livraison en sus, prix gelé) |
| T-073 | Commander plusieurs exemplaires, avec des paliers dégressifs à fournir | paiement | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 16/09 : barème de Mathias (1er plein, 2e −30 %, suivants −50 %, max 10) dans `exemplaires.ts`, sélecteur sur `/numero`, une ligne Stripe par rang, `count` Cloudprinter, migration 20260916 |
| T-074 | Un prix selon le pays de livraison exige de demander le pays avant le prix | produit | serieux | avis-requis | **fermé** (10/09 : pays demandé à l'écran 4, livraison par devis selon le pays) |
| T-075 | Les ventes de l'atelier ne passent pas par la comptabilité InvoiceXpress | paiement | serieux | avis-requis | nouveau |
| T-076 | Les dossiers abandonnés gardent leurs données personnelles sans limite de durée | donnees | serieux | avis-requis | **rétention armée le 02/09** — migration appliquée, template M10 poussé (ID 40), `BREVO_TEMPLATE_M10_ID` live en prod (Santé sans alerte). Reste seulement, différé exprès : un cron une fois éprouvé, et exclure les anonymisés de T-023 |
| T-077 | Les specs d'impression des deux produits Cloudprinter ne sont pas sur le disque | produit | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 11/09 : la formule du dos est dans le code (`dosMmPourPages`, déduite du papier, figée par le harnais), le contrôle PDF juge enfin la largeur d'une couverture enveloppante, et les CGV v3.2 décrivent l'objet réel |
| T-078 | Aucun moteur ne transforme les gabarits de mise en page en PDF imprimable | atelier | serieux | avis-requis | en cours — étape 0 livrée le 30/08. **Débloqué le 11/09** : T-077 est fermé, la géométrie que le moteur devra produire est écrite et éprouvée (`FORMAT_PAGE_PDF_MM`, `dosMmPourPages`, `largeurCouvertureMm`) |
| T-079 | Le dashboard métriques n'a pas d'insights ni de stratégie assistés par IA | admin | confort | avis-requis | en pause (30/08, le bloc « Lecture » suffit — attendre ~50 dossiers) |
| T-080 | Le dashboard métriques mérite un vrai design de tableau de bord | admin | confort | libre | en cours (07/09) — rendu sorti de la page (Vue.tsx, pour pouvoir le REGARDER sans base ni session) + rangée de quatre chiffres clés en tête. L habillage fin attend la référence visuelle de Mathias |
| T-081 | Rien ne compare les paiements Stripe aux dossiers de la base | paiement | serieux | avis-requis | en cours — **lancé sur la vraie base le 08/09**, deux passes en lecture seule : 0 écart en livemode, et 2 écarts levés en `--avec-test` (dossiers de recette supprimés). Le filet est prouvé DÉTECTEUR. Reste le seul choix du déclencheur : Vercel Hobby n'autorise qu'un cron/jour, déjà pris par la relève |
| T-082 | Les lectures de `CHAMPS_MAIL` n'ont pas le repli 42703 que le reste du code a | donnees | serieux | libre | **fermé** (fiche dans `fermes/`) — corrigé le 02/09 : helper `lireNumerosMail` (repli sur `CHAMPS_MAIL_REPLI`) sur les 5 lieux de lecture. Dormant tant que les colonnes existent. tsc+lint+build+harnais verts |
| T-083 | Les CGV portugaises n'ont pas d'URL à elles et sont invisibles pour Google | front | serieux | libre | **fermé** (fiche dans `fermes/`) — fait le 03/09 : URL par langue (`/en/cgv`, `/pt/cgv`), canonical auto-référent + hreflang/x-default, `?lang=` en 308 (ref préservé), sitemap. Aucun texte légal touché. tsc+lint+build + runtime verts |
| T-084 | Deux dossiers ouverts pour la même adresse ne sont signalés nulle part | admin | serieux | libre | **fermé** (fiche dans `fermes/`) — part 1 (constat Santé orange, sur `email_canonical`) livrée le 02/09 (PR #27) ; part 2 (lien sur la fiche) existait déjà (« Ses autres numéros »). tsc+lint+harnais verts, détection validée sur la base |
| T-085 | La fiche produit de `/magazine` n'a ni image conforme ni conditions marchandes | produit | serieux | avis-requis | en cours — 15/09 : l'image du `Product` passe de 450 à **1600 px**. ⚠️ Mais le master BJ-M07 est le doublon de la double page, pas la photo d'objet : Mathias le garde en point, sans le changer. Le point 2 (conditions marchandes) n'a pas bougé |
| T-086 | Sur desktop, la bande « étapes 1-2-3 » occupe un espace sans rapport avec son contenu | front | confort | avis-requis | **fermé** (fiche dans `fermes/`) — livré le 07/09, prouvé dans `main` le 08/09 (`content.ts:67-68`, `Kiosque.tsx:194`, branche fusionnée) |
| T-087 | Sur téléphone, le prix de la PDP est compressé à la limite de la lisibilité | front | confort | libre | **fermé** (fiche dans `fermes/`) — fait le 03/09 : libellés des cartes remontés (`.combien` 10→11 px, `.pages` 11→12 px), interlignes resserrés pour ne PAS bouger le bouton (delta 0 mesuré à 375×667). build vert |
| T-088 | Le logo en haut du questionnaire et de la page cliente est un clic mort | front | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — livré le 07/09, prouvé dans `main` le 08/09 (`Composer.tsx:443,497,505`, branche fusionnée). `/numero` non touché, choix produit documenté |
| T-089 | La maquette que reçoit le client — visionneuse multi-format façon magazine | front | serieux | avis-requis | en cours — prototype v3 + fondation (#28) + **visionneuse `/numero` livrée (PR #29, rendu réel validé)** ; reste l'admin (T-090) et les vrais visuels |
| T-090 | Admin — planche couverture, découpage centré, doubles pages à la demande, drag-and-drop | admin | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — livré (PR #33) : dépôt de la planche, 0 à 3 doubles pages réordonnables au glissé, restitution fidèle sur la fiche. Le curseur de coupe reste écarté (centre auto, décision Mathias) ; le recadrage intra-page est demandé le 07/09 et reste à faire ; **le recadrage intra-page est livré le 08/09** : la planche était coupée par deux ancres CSS fixes, elle a maintenant deux réglages indépendants (C1 et C4 sont deux faces du même fichier), sans migration — tout vit dans le `jsonb` `apercu_urls.cadrages`. Sans geste de l'atelier, l'affichage est pixel pour pixel l'ancien |
| T-091 | Réagir à la maquette, pas seulement partir — thèmes + freestyle | produit | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 15/09, en production : neuf modèles de couverture choisissables à l'écran 3, « aucune préférence » toujours visible, et le choix remonte sur la fiche du dossier (PR #143, migration 20260915 appliquée et vérifiée). La feuille d'ajustement était livrée le 02/09 (PR #30/#31). Le titre vivant a été construit puis débranché par Mathias — archivé entier dans `archive/titre-vivant-composer/` |
| T-092 | Refonte du parcours questionnaire — logo officiel + Q1 à Q5 | front | serieux | avis-requis | nouveau (02/09, cahier des charges de Mathias) |
| T-093 | Plusieurs couvertures proposées, la cliente choisit sa préférée | produit | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 08/09 : je le rouvrais pour livrer le geste de choix, il était DÉJÀ là (parti avec le chantier du 07/09, fiche non recalculée). Bouton, marque « votre choix », message d'échec et mot rassurant vérifiés dans `Apercu.tsx` |
| T-094 | La demande « montrer un extrait » repart dans un mail, plus sur /numero | backend | mineur | avis-requis | nouveau (02/09) — la fiche existait, la ligne d'index manquait ; réparé le 04/09 |
| T-095 | En reprise sur un autre appareil, le dépôt affiche zéro photo et verrouille l'envoi | front | serieux | libre | **fermé** (fiche dans `fermes/`) — corrigé le 04/09, PR #47 **mergée** (vérifié le 07/09 : le commit est dans main) |
| T-096 | Le carnet de l'atelier n'est lisible que dossier par dossier — le rendre exploitable | admin | serieux | avis-requis | en cours — **marches 1 ET 2 livrées le 08/09, migration APPLIQUÉE**. Marche 2 : `/admin/atelier/carnet`, toutes les notes, cherchables et exportables (txt pour lire, csv pour trier), filtre PUR partagé par l'écran et l'export. Marche 1 : les cinq genres (photos · recit · page · cliente · atelier), facultatifs, sans `check` en base. `20260908_notes_genre.sql` appliquée le 08/09 et **le revers du repli contrôlé** : note écrite par la vraie route, `genre='page'` relu en base, étiquette à l'écran, colonne remplie au CSV, note de test supprimée derrière. Reste la marche 3 (cible sur une photo ou une page) |
| T-097 | Les mails à retardement partent jusqu'à 24 h après l'heure annoncée | atelier | serieux | avis-requis | en pause (04/09) — relève horaire écrite et vérifiée, **inerte tant que le secret GitHub n'est pas posé** ; immédiats prouvés à moins de 2 s |
| T-098 | Un M4 refusé par Brevo figeait le dossier payé pour toujours | atelier | bloquant | libre | **fermé** (fiche dans `fermes/`) — corrigé le 04/09 : réparation sur preuve d'échec (`doitRattraperM4`), 6 assertions au harnais |
| T-099 | L'ouverture de l'accueil rejoue à chaque retour et se fait bousculer par le défilement | front | serieux | libre | **fermé** (fiche dans `fermes/`) — corrigé le 04/09 : ouverture jouée une fois par onglet, prise en main au défilement, défilements pilotés interruptibles |
| T-100 | Les treize fondateurs ont un compte qui les attend, et personne ne le leur a dit | atelier | serieux | avis-requis | nouveau (07/09) — mail C3 à écrire, à envoyer **quand l'atelier est prêt**, jamais avant |
| T-101 | La connexion Google de toutes les clientes dépend d'un seul compte personnel | exploitation | serieux | libre | nouveau (07/09) — Louis à passer Propriétaire du projet Google Cloud ; **geste console, hors dépôt** |
| T-102 | Trente-sept images sont déployées à chaque build sans que rien ne les demande | front | confort | libre | **fermé** (fiche dans `fermes/`) — 08/09 : 35 archivées, **3,9 Mo hors du déploiement** (`public/` suivi par git : 9,0 → 5,1 Mo). ⚠️ Le piège s'est refermé sur 2 fichiers : l'API Brevo interrogée montre `instagram.png` dans **18 templates actifs** et `decor-album-email.jpg` dans 3 — ils RESTENT. Règle : avant de déplacer une image de `public/`, interroger Brevo, pas seulement `grep` |
| T-103 | Un template de mail actif affiche une image qui répond 404 | contenu | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 08/09 : le template 13 est un ORPHELIN. L'interface Brevo ne connaît que les messages #12 et #14 de la séquence ; le 13 n'est branché sur aucune étape, d'où le refus de l'API en écriture. Un template orphelin ne part jamais : l'image 404 ne sera vue par personne. C'est en le vérifiant qu'on a trouvé T-104 |
| T-104 | S'inscrire aujourd'hui déclenche deux mails qui annoncent des préventes closes | contenu | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — ouvert ET fermé le 08/09. `/ambassadeurs` (200, formulaire vivant) → liste Brevo 3 → automation ACTIVE → deux mails de l'ère prévente. Coupé en **trois** endroits indépendants : automation en pause (vérifiée), page en 410, les deux routes en 410. Ouvert en `bloquant`, fermé le jour même |
| T-105 | Recommander un numéro déjà livré, depuis la bibliothèque | paiement | serieux | avis-requis | **en pause** (08/09) — structure posée et VERROUILLÉE, comme T-073. `REIMPRESSION_CENTIMES = null` dans `prix.ts`, module pur `reimpression.ts` (`peutRecommander`), bouton en place dans `/compte/magazine/<token>` mais jamais rendu, dix tests qui gardent le verrou. Mathias a tranché le CIRCUIT (paiement → impression directe, sans passage par l'atelier) et **pas le prix — parce qu'il ne le connaît pas** (dit tel quel le 08/09). Le ticket n'attend donc pas un arbitrage mais des COÛTS : tarif Cloudprinter à l'exemplaire par palier, port FR/BE/LU, marge voulue. Ne pas lui reposer la question, lui apporter les chiffres. Restent ensuite la route Stripe, la branche webhook + commande Cloudprinter, deux mails, et la trace en admin |
| T-106 | La politique de livraison facturée au client (plafond, tarif fixe ou port compris) n'est pas tranchée | paiement | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 16/09 : zones A 5 € / B 13 € / C au devis, offerte dès 50 € TTC de magazines (tableur du 15/09, validé par Louis) ; plafond archivé ; CGV v4.0 et page `/livraison` |
| T-107 | Les mails mettent 5 à 9 minutes à arriver, alors que le site les soumet à la seconde | atelier | serieux | avis-requis | nouveau (11/09) — mesuré 5 min 07 s à 8 min 57 s sur trois mails, MAIS 2 s sur le M3 de Klervie le même jour : le retard est INTERMITTENT, pas structurel. Caractériser avant de payer un plan |
| T-108 | Un test automatisé a créé un vrai dossier et envoyé un vrai mail | atelier | serieux | libre | **fermé** (11/09, PR #124 : `ATELIER_MAILS_COUPES` dans les deux chemins d'envoi) |
| T-109 | Impossible de relancer un client depuis l'atelier, et une relance ne partait qu'une fois | admin | serieux | libre | **fermé** (11/09, PR #128 et #129 : bouton sur la ligne, colonne « Dernier mot », deux relances par motif, 72 h entre deux — aucun template Brevo créé, aucune migration) |
| T-110 | La relance manuelle, ce qui reste après le premier lot | admin | confort | libre | nouveau (11/09) — relance groupée, pile « Sans réponse », téléphone sur la ligne. **Et le chemin d'envoi RÉEL n'a jamais été exercé** : à prouver au premier usage |
| T-113 | Archiver, récupérer et supprimer définitivement un dossier depuis l'admin | admin | serieux | libre | **fermé** (14/09, PR #133 : archiver, récupérer, supprimer définitivement depuis la fiche ; migration 20260914 appliquée ; cycle complet testé par Mathias sur un dossier de test) |
| T-112 | Les nouvelles demandes de la journée ne se lisent pas, et rien ne dit quand c'est à nous | admin | serieux | libre | **fermé** (11/09 : boîte du jour « Depuis hier », colonne « Prochaine étape », deux camps ; règles pures `arrivees.ts` et `prochaineEtape.ts`, `Flux.tsx` archivé) |
| T-111 | La table de travail recharge tout, tout le temps | admin | confort | libre | nouveau (11/09) — le parallélisme des lectures est fait (PR #128) ; restent le rafraîchissement complet chaque minute, l'action qui recharge vingt lignes, la navigation vers la fiche. ⚠️ Mesurer entre deux déploiements AVANT d'annoncer quoi que ce soit |
| T-115 | Le cockpit de décision : quand faut-il avoir lancé le développement pour ne pas saturer l'atelier | admin | serieux | avis-requis | en cours (17/09, branche `feat/cockpit-decision` : deux tables + `numeros.origine`, job du lundi idempotent, modèle pur au harnais, écran `/admin/atelier/cockpit`. migration appliquée le 17/09 ; **attend Mathias** : premier réglage des curseurs, origine des dossiers payés ; marge mesurée impossible sans coût d'impression par commande) |
| T-114 | L'ordre des photos vu par l'atelier n'est pas celui dans lequel le client les a déposées | atelier | serieux | libre | **fermé** (17/09 : le navigateur envoie son rang à `/presign`, le serveur l'écrit ; les ajouts d'une seconde session se rangent après le coffre ; tri secondaire `created_at` ; module pur `rang.ts`, 19 cas au harnais ; aucune migration) |
| T-116 | M0 « il attend vos photos » arrive à la seconde, pendant que le client est encore en train de déposer | atelier | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 18/09, PR #162 en prod : M0 programmé chez Brevo pour +15 min à la création, retiré de la file à la première photo ou au clic « Envoyer » ; journal `mail_programme` / `mail_annule` ; module pur `programme.ts`, 19 assertions ; texte de M0 réécrit, template 38 poussé ; mécanisme prouvé en bac à sable Brevo |
| T-117 | Des féminins résiduels subsistent dans le visible, contraires à la règle du masculin générique | contenu | confort | avis-requis | **fermé** (fiche dans `fermes/`) — 18/09 : inventaire sur quatre surfaces (40 templates Brevo lus par l'API, 36 docx légaux propres), pages et admin corrigés (PR #169), M10 corrigé à la source (PR #170) et template 40 repoussé sur demande de Mathias |
| T-118 | Sur mobile, le bas des écrans du questionnaire passe sous la barre fixe, surtout à l'écran du titre | composer | serieux | libre | **fermé** (fiche dans `fermes/`) — 18/09 : deux causes du 03/09, le « Retour » de la barre jamais masqué sur mobile (spécificité) et une réserve fixe de 110 px sous une barre qui monte à 176 px avec une erreur ; la barre est maintenant mesurée (`--at-barre-h`) et la réserve la suit ; desktop indemne |
| T-119 | La page de suivi du numéro fait fouillis (typos, espacements, boutons, trop d'informations) | numero | serieux | libre | **fermé** (fiche dans `fermes/`) — 18/09 : planche validée (axe centré), coquille commune + états maquette (PR #173), couverture (PR #174), en route et chez vous (PR #175) en prod ; six planches de captures vues par Mathias, « c'est propre » |
| T-120 | Le mail « part à l'impression » (M6) arrive au client avant que la commande d'impression n'existe | atelier | serieux | avis-requis | en cours (18/09, PR #177 EN PROD) — Mathias a tranché : M6 part à `envoyer_impression`, plus à la validation ; `codesPour` déplacé, texte corrigé, template 33 repoussé, page `/numero` « Validé. Nous préparons l'impression. » ; harnais et build verts, page vérifiée sur le déploiement ; reste à prouver sur la première commande réelle que M6 part à ce moment |
| T-121 | La fiche doit recouper elle-même l'export Canva en pages d'impression, l'atelier ne peut pas passer par un script à chaque dossier | atelier | serieux | avis-requis | en cours (21/09 : contrôle des bords au dépôt, PR #187 EN PROD ; 18 et 19/09, PR #181 → #186 EN PROD) — découpe dans le navigateur au dépôt (`decoupe.ts` pur + `preparerPdf.ts`), réserve côté couture = propre bord de la page, dos inséré à la cote du dossier, la transition relit les PDF du coffre et refuse un format faux, la fiche mesure le fond perdu de chaque page (`bords.ts` + pdf.js) et nomme la page et le bord courts ; restent la résolution des photos (points 6 et 7) et le redépôt par Mathias de l'export du 19/09 15:21 ; **23/09 : découpe prouvée sur un 2e dossier réel (Lara, 38 p.), aucune photo déformée (écart max 0,438 %), mais une photo à 147 dpi et onze placements sous 200 dpi que la fiche ne voit pas** — les points 6 et 7 sont chiffrés et un point 8 s'ajoute (repérer les photos agrandies par logiciel : « améliorer l'image » de Canva rend 43 % du détail sur une photo faible et en DÉTRUIT 32 % sur une photo déjà bonne) |
| T-125 | Choisir ce qui part dans le lot, doublons et captures d'écran écartés d'office | admin | serieux | libre | en cours (21/09, PR #199 EN PROD) : bouton « Choisir » sur la carte des photos, doublons et captures écartés d'office (`ecarteeDOffice`, règle pure, rien d'autre), chaque vignette se bascule, « Tout garder » / « Écarter les doublons et captures », « Télécharger les N gardées » ; la route nommait déjà sur le lot complet puis filtrait (T2-5), donc écarter la 03 laisse 01, 02, 04 ; état d'écran, rien en base |
| T-124 | Les fichiers du lot portent la date et le lieu, pour se repérer dans Canva | atelier | serieux | libre | en cours (21/09, PR #197 EN PROD) : `01 - 08 aou 2024 - Seville - IMG_4207.jpg`, le rang toujours en tête (T-114), mois en trois lettres sans accent (juin/juil gardent une lettre, « jui » ne dirait pas lequel), ville sinon pays, sans accent parce que `curl -OJ` n'écrit que l'ASCII ; la route du lot lit `prise_le`/`lieu_*` avec repli 42703 ; harnais +9 ; reste à voir sur un vrai téléchargement Chrome |
| T-123 | Les photos savent quand et où elles ont été prises, et l'atelier ne le voit pas | atelier | serieux | avis-requis | en cours (21/09, PR #194 EN PROD) — l'EXIF était déjà intact dans le coffre, rien ne le lisait ; lecture en back après chaque lot (`after()`), lieux Geoapify au consentement (un appel par lieu), modules purs `metadonnees.ts` / `empreinte.ts` / `lieux.ts` au harnais, fiche (résumé, « Par date », remarques) et brief (« chronologie et lieux ») ; migration `20260921` appliquée et clé Geoapify posée le 21/09, rattrapage fait (503 photos, 106 appels), déploiement `5cfc8f2` vérifié ; reste la preuve de la tâche de fond sur un vrai dépôt (journal `metadonnees_lues`) |
| T-122 | Le PDF souvenir se fabrique deux fois après « Envoyer à l'impression », et la fiche dit « pas encore généré » pendant qu'il se fabrique | atelier | serieux | libre | en cours (21/09, branche PR #190 EN PROD) : constat re-vérifié au journal de Merisa (deux `souvenir_genere` à 16 s d'écart, séquentiels, le premier objet supprimé par le second, pas d'orphelin) ; verrou dans le journal (`souvenir_demarre` → `genere`/`echoue`, 409 `deja_en_cours`, règle pure au harnais), carte « Génération en cours… » lue au journal, second refresh à la fin de la fusion ; sans migration ; reste à voir sur la prochaine commande réelle |
| T-126 | Le lien Canva partagé se publie sans que personne ait vu vers quel design il mène | admin | bloquant | libre | **fermé** (fiche dans `fermes/`) — 22/09 : PR #201 en prod, le dry-run nomme le design (`canva.ts` + `canvaDistant.ts`, harnais +21) ; lien de Marjorie corrigé et republié à 10:16, preuve prod faite, mail d'excuse parti |
| T-127 | Un lien Canva en édition, en lecture seule ou fermé passe la publication de la maquette | admin | serieux | libre | **fermé** (fiche dans `fermes/`) — 22/09 : PR #201 en prod ; ⚠️ le chemin `/edit` ne prouve rien, le rôle de la liste d'accès décide ; EDITOR / VIEWER / NONE / non partagé / sans extension refusés en 422 |
| T-128 | Le lot téléchargé ignore le bouton « Par date » et garde la numérotation du dépôt | admin | serieux | libre | en cours (22/09, PR #206 EN PROD) : constaté par Mathias sur Eloise (63 photos, dépôt de juillet vers janvier) ; c'était une décision du 21/09 (T-124 : « la date ne réordonne rien »), renversée : le lot suit la grille, la route reçoit `ordre: "date"` et numérote le lot COMPLET dans l'ordre du temps, sinon le dépôt (T-114 tient) ; `ordonnerLot` réutilise le tri de la grille ; harnais +6 ; reste un vrai téléchargement Chrome à voir |
| T-129 | Le jour de prise de vue sur chaque vignette de la fiche, pas seulement en tri « Par date » | admin | confort | libre | en cours (22/09, PR #206 EN PROD) : le voile `ate-photo-jour` existait mais ne s'affichait que sous `parDate` ; désormais sur chaque vignette datée, forme du nom de fichier (`jourCourt`, « 11 juil 2026 ») |
| T-130 | La grille de la fiche par sous-groupes de lieu, et le lot qui suit | admin | confort | libre | en cours (22/09, PR #206 EN PROD) : bouton « Par lieu », **deuxième passe l'après-midi, PR #207 EN PROD** : un groupe par SÉJOUR dans l'ordre du temps (nouveau groupe à chaque changement de ville, sinon pays ; une datée sans lieu reste dans le séjour en cours), « Sans date » en queue dans l'ordre du dépôt, titre = lieu + compte + période (`grouperParLieu`, pur) ; le lot descend dans le même ordre (`ordre: "lieu"`) ; harnais +7 |
| T-131 | Les photos sans date calées près de leurs voisines de dépôt, en option | admin | confort | libre | en cours (22/09, PR #209 EN PROD) : bouton « Sans date : voisines » hors de l'ordre du dépôt ; chaque sans date emprunte la date de sa voisine de dépôt POUR SE RANGER (enveloppe, la vignette reste sans date), entre dans son séjour en « Par lieu » ; le lot suit (`sansDate: "voisines"`) ; harnais +8 |
| T-133 | Deux lots dans deux ordres s'écrivaient dans le même dossier, numérotations mêlées | admin | serieux | libre | en cours (22/09, PR #211 EN PROD) : `nomDossier` ignorait l'ordre, un lot par date s'AJOUTAIT au lot du dépôt (préfixes différents, rien d'écrasé) ; le dossier porte désormais l'ordre (« … (par date) ») ; le tri lui-même était juste |
| T-132 | Le lieu sous le jour sur chaque vignette de la fiche | admin | confort | libre | en cours (22/09, PR #212 EN PROD) : le voile de la vignette prend une seconde ligne, la ville sinon le pays ; le rang de dépôt proposé a été refusé par Mathias |
| T-134 | Après des retouches, le client reçoit M5 mot pour mot, sans un mot sur les corrections qu'il a demandées | atelier | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 23/09, PR #214 : un SECOND GABARIT pour le code M5 (« vos corrections sont faites », Brevo 46), verrou et garde-fou de chaîne intacts, repli sur le gabarit ordinaire ; case « j'ai corrigé » cochable à la main quand le client a écrit dans le Canva sans cliquer. **PROUVÉ EN RÉEL le 23/09 sur le dossier de Marjorie** : `template_id: 46` en base, journal `mail_reouvert` → `mail_envoye`, date limite du mail = celle de l'auto-validation |
| T-135 | L'écran de confirmation promet M5 sans vérifier que le mail précédent est parti | admin | confort | libre | nouveau (23/09) — relevé en livrant T-134 : la ligne « Mail » est écrite en dur quand la case « j'ai corrigé » est cochée, au lieu d'être dérivée de la projection serveur, donc elle ne rejoue pas le garde-fou de chaîne. N'a pas touché Marjorie (son M4 était parti, vérifié en base avant le clic). Piste : faire rendre au serveur les DEUX réponses, l'écran ne fait que lire |
| T-136 | La cliente reçoit un numéro de suivi sans lien pour le suivre, et le nom du transporteur porte une coquille | atelier | serieux | avis-requis | nouveau (25/09) — relevé sur la PREMIÈRE expédition réelle (Merisa, 23/09) : `transporteur` = « Correos Ecoonomy » (coquille de Cloudprinter recopiée par `capitaliser`), `tracking_code` de 24 caractères, **`tracking_url` = NULL** parce qu'aucun motif de `TRANSPORTEURS` (`suivi.ts`) ne correspond. La règle « jamais de lien approximatif » est BONNE et ne se casse pas : il faut ajouter Correos avec une adresse VÉRIFIÉE, jamais devinée (le code commence par `JVGL`, ça ressemble à du GLS, rien n'est vérifié). Vérifier aussi que le gabarit M7 se lit sans bouton mort quand `url` est nul |
| T-137 | La géométrie d'impression suivait la facture, pas le bloc composé | atelier | bloquant | libre | en cours (25/09, branche `feat/pagination-imprimee`) — relevé sur le dossier d'Eloïse (48 pages facturées, bloc composé à 50) : `payloadCommande` envoyait `total_pages = nb_pages`, donc **48 feuilles commandées pour un fichier de 50**, dos et couverture jugés sur 48, et la découpe au dépôt taillait la feuille enveloppante sur la même cote. `refusDeCommande` bloquait l'écart DANS LES DEUX SENS, et aucun écran ne permet de corriger `nb_pages` depuis `validee` (les deux actions qui l'écrivent regèleraient le prix). **Racine : `nb_pages` faisait la facture ET la géométrie.** Les deux sont séparées, sans migration : `nb_pages` reste la pagination FACTURÉE, la pagination IMPRIMÉE se lit dans le PDF du bloc (`paginationImprimee`) et pilote dos, couverture, produit et `total_pages`. Règle tranchée par Mathias, ASYMÉTRIQUE : un `surplus` passe et nous coûte, un `manque` refuse toujours. Surplus hors produit refusé, bloc lu AVANT la couverture, écart montré au panneau avant le clic et écrit au journal (`pagination_surplus`). Prouvé sur les fichiers réels d'Eloïse : total_pages 50, dos 3,60 mm, couverture déposée à 429,50 mm **conforme** sur 50 pages (0,10 mm < tolérance, aucun redépôt) ; harnais 1330 vérifications, tsc/lint/build verts |
| T-138 | Le client tape son adresse en clair et personne ne la vérifie avant qu'elle parte chez l'imprimeur | atelier | serieux | libre | nouveau (25/09) — relevé sur le dossier d'Eloïse, quinze minutes avant sa commande : « Rua antero de **quantal** n3 » rend **confiance 0** chez Geoapify (seuls résultats : Almada et Amora, deux autres communes) ; avec la bonne graphie « Rua Antero de Quental » et le MÊME code postal, confiance 1. L'adresse vient de Stripe Checkout en champs libres et `adresseCloudprinter` ne contrôle que la PRÉSENCE des champs, jamais qu'ils désignent un lieu réel. L'erreur était détectable avec une clé qu'on a déjà (`GEOAPIFY_API_KEY`, en prod depuis T-123). Deux gestes : un filet au dry-run d'`envoyer_impression` (REMARQUE, jamais refus, best-effort comme le contrôle des bords) et la suggestion À LA SAISIE, qui est le vrai correctif. **À regarder d'abord : ce que le formulaire Stripe propose déjà**, avant d'écrire une ligne. Le client doit toujours pouvoir passer outre : une adresse réelle absente d'une base de géocodage existe |
| T-139 | Il n'existe aucun socle pour ouvrir une édition collective sans toucher au B2C | collectif | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — 13/10 : phase 0 de l'Édition collective en production (PR #225), migration `20261013_collectif.sql` appliquée par Mathias et vérifiée en SQL (13 tables, RLS, triggers, aucune clé vers `numeros`). `COLLECTIF_OUVERT` pas encore posé : tout le B2B répond 404 |
| T-140 | L'atelier ne peut ni ouvrir une édition collective ni créer les styles du mur | collectif | serieux | libre | en cours (fusionné le 13/10, PR #225 à #227, derrière `COLLECTIF_OUVERT`) — liste, création (aucun chiffre pré-rempli, clôture à l'heure de Paris), fiche (liens copier / régénérer, gestes en deux temps, journal), éditeur de styles complet avec images (passées par le serveur : le CORS du bucket ne connaît pas localhost:3006). Recette Claude faite en local contre la base de production (édition et style « Essai technique », l'édition archivée). Reste : la recette de Mathias, puis le test d'un vrai PDF Affinity |
| T-141 | Le client B2B n'a pas d'espace, ni menu, ni tableau de bord, ni dossier, ni messagerie | collectif | serieux | libre | en cours (fusionné le 14/10, PR #229, avec la révision T-147 qui a repris ces écrans ; derrière `COLLECTIF_OUVERT`) — coquille à menu persistant et verrous (tiroir mobile), tableau de bord vide ET en cours, « Votre dossier » (prévu, documents, messagerie 3,5 s dans les deux sens, prouvée à l'écran), lien équipe en 403 partout où il écrirait. Reporté : le QR code (phase 3) |
| T-142 | Les participants et le responsable ne peuvent pas déposer leurs photos d'événement | collectif | serieux | avis-requis | en cours (fusionné le 14/10, PR #229, repris par la révision T-147 ; derrière `COLLECTIF_OUVERT`) — moteur d'envoi séparé du B2C (flux borné, reprise par clé de fichier vérifiée avant réduction), lien participant mobile, plafonds par appareil et total, grille paginée avec filtres, présélection, signalement, liens de provenance, lot atelier par provenance. Prouvé en local contre la prod (plafond, reprise sans doublon, doublon repéré, clôture). Fait depuis : vignette HEIC (T-150), texte de l'accord choisi par Mathias le 17/10 (PR #245), B2B en production le 17/10. Reste : essai sur de vrais téléphones (T-155) |
| T-143 | Le responsable ne peut pas choisir le style de ses magazines | collectif | serieux | libre | en cours (fusionné le 14/10, PR #229, repris par la révision T-147 ; derrière `COLLECTIF_OUVERT`) — mur des styles (filtres, magazines, tag de sélection, brief à droite), page d'un style (palette, texte, 1 à 5 doubles pages, couvertures aimées plafonnées), validation, reprise d'un magazine à l'autre, règle intérieur / couverture tenue par le code et écrite à l'écran, brief lisible côté atelier. Prouvé en local. Reste : un vrai style de Mathias |
| T-144 | Le bon à tirer d'un magazine collectif ne se relit pas en ligne | collectif | serieux | avis-requis | en cours (fusionné le 14/10, PR #229, repris par la révision T-147 ; derrière `COLLECTIF_OUVERT`) — dépôt d'un tour rendu dans le navigateur (rognage TrimBox, appariement par le texte puis l'image, zones), couvertures, liseuse avant / après, notes typées, validation en deux temps. Prouvé en local. Reste : un vrai export Affinity et la largeur de rendu `[À FIXER]` (PRD §12.10) |
| T-145 | Le client B2B ne peut ni demander un appel ou une modification, ni suivre sa livraison | collectif | serieux | libre | en cours (fusionné le 14/10, PR #229, repris par la révision T-147 ; derrière `COLLECTIF_OUVERT`) — demande de modification (message + journal), propositions complémentaires acceptées sans paiement, page Livraison (étapes datées, transporteur, lien de suivi, adresse), panneau atelier. Prouvé en local jusqu'à « livrée » |
| T-146 | Mails, relances, temps réel et imports de l'Édition collective sont prévus mais pas codés | collectif | serieux | avis-requis | en cours (15/10, `feat/collectif-mails`) — un seul circuit d'envoi coupé par défaut (`COLLECTIF_MAILS`, verrou, journal), le mail « Votre espace est prêt » envoyé depuis la fiche avec un aperçu ; texte à valider par Mathias ; reste la liste des autres mails et les rebonds B2B ; 19/10 : relance des participants (aucune adresse demandée aujourd'hui) et A1 (prévenir l'atelier) notés |
| T-147 | L'espace client de l'Édition collective se lit comme un site, pas comme un logiciel | collectif | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — révision du 13/10 (PRD §14) faite et fusionnée le 14/10 (PR #229) : jour / nuit, aucune page qui défile, tableau de bord, BAT plein écran, Parler à l'atelier, brief partie par partie ; migration `20261014` appliquée par Mathias et rejouée en vrai. Les deux décisions ouvertes (rendez-vous pris, questions du mot du dirigeant) vivent au PRD §12.13 et §12.14 |
| T-148 | Le client B2B prend son rendez-vous hors de l'espace et ne le retrouve pas dedans | collectif | serieux | avis-requis | en pause (14/10, pas la priorité n°1 selon Mathias, carte Notion « En attente ») — D23 codé : créneaux libres de l'interlocuteur (lun-ven, 10 h-18 h, 30 min) lus en disponibilités seules, réservation, déplacer / annuler, mails .ics (fermés tant que le texte n'est pas validé), fiche et page Agendas ; migration `20261015` appliquée ; attend le choix de la visio (Meet fixe ou généré, recommandé), le compte Google et les agendas reliés |
| T-149 | L'envoi des photos et l'atelier peuvent être bien plus fluides qu'aujourd'hui | collectif | confort | avis-requis | nouveau (14/10) — intention de Mathias : un envoi qui ne s'arrête pas, abonnements possibles plus tard, Claude dans le projet si ça sert ; pistes à MESURER avant de choisir |
| T-150 | Les photos HEIC de l'Édition collective n'ont ni aperçu ni empreinte, les doublons ne les voient pas | collectif | serieux | libre | **fermé** (fiche dans `fermes/`) — 15/10 : libheif en WebAssembly à l'envoi quand le navigateur ne lit pas le HEIC, l'original intact ; rattrapage des 423 HEIC d'« Essai révision » ; doublons : 20 copies repérées au lieu d'une |
| T-151 | Les retours de Mathias sur l'espace client de l'Édition collective (14/10) | collectif | serieux | avis-requis | en cours (14/10, `feat/collectif-retours-ux-1`) — maquettes validées ; faits : 1, 3, 5 à 12 (Photos, partage, envoi, contenus, dossiers, citer un envoi) ; migration 20261016 appliquée et rejouée ; style « tout en vrac » fait (D24), migration 20261017 à appliquer par Mathias |
| T-152 | Les retours du 14/10 au soir : photos rangées en dossiers, liens à part, atelier réorganisé | collectif | serieux | avis-requis | en cours (fusionné le 15/10, PR #234, derrière `COLLECTIF_OUVERT`) — faits : photos en dossiers, onglet liens, dépôt par nom, documents dans la page, répondre, atelier unifié, fiche en cartes, Porcelaine / Charbon ; reste la question « l'acceptation fait-elle foi » |
| T-153 | Les serveurs Vercel tournent à Washington, la base à Dublin : chaque lecture traverse l'Atlantique | perf | serieux | libre | **fermé** (fiche dans `fermes/`) — 15/10, PR #237 : fonctions à Dublin ; mesuré avant (tableau de bord d'une édition 1 190 → 361 ms, liste des photos 1 041 → 424 ms) et vérifié en production |
| T-154 | Rien ne vérifie que le lien du responsable est ouvert par le responsable, et il ne peut pas le retrouver seul | collectif | serieux | avis-requis | en cours (16/10) — lecture sur un appareil nouveau, code par mail pour modifier (24 h, 10 essais) ; « Retrouver mon espace » fait (`/espace`) ; tout coupé tant que `COLLECTIF_MAILS` (et `COLLECTIF_CODE_APPAREIL`) ne sont pas ouverts ; reste le lien dans `/compte` |
| T-155 | Les gros envois de photos n'ont été prouvés qu'en local, jamais en ligne ni sur un iPhone en 4G | collectif | serieux | libre | nouveau (15/10) — 17/10 : B2B ouvert en production, les 7 essais archivés ; reste l'envoi de 2000 photos et l'iPhone en 4G, sur une édition neuve |
| T-156 | On peut déposer les photos d'un client dans le dossier d'un autre sans que l'écran le montre | atelier | bloquant | libre | **fermé** (fiche dans `fermes/`) — 17/10, PR #247 en production : l'écran de dépôt nomme le dossier (titre, prénom lus au serveur), bandeau quand l'atelier est connecté, « nouveau numéro » ne rouvre plus un dossier existant, un lot identique à celui d'un autre dossier devient une remarque sur la fiche ; vérifié en ligne. Incident du 06/10 (92 photos de Merisa chez Justine) nettoyé à part |
| T-157 | Un style d'essai, « Essai technique Claude », est en première place sur le mur que voit un vrai client | collectif | serieux | libre | **fermé** (fiche dans `fermes/`) — 19/10 : style d'essai retiré du mur, « Grand air » remis, sur l'accord de Mathias |
| T-158 | La politique de confidentialité ne parle ni des participants d'une édition ni de leurs photos, et il n'existe aucun accord sur les données pour les entreprises | collectif | serieux | avis-requis | nouveau (19/10) — texte légal : je prépare la liste exacte de ce que le B2B collecte, Mathias fait rédiger |
| T-159 | Rien n'efface les photos d'une édition collective après la livraison, et aucune durée n'est fixée | collectif | serieux | avis-requis | nouveau (19/10) — délai à fixer par Mathias (PRD §12.5), puis script sur le modèle d'`anonymiser-dossiers` |
| T-160 | Si une route de l'Édition collective échoue, rien ne le montre à l'atelier | collectif | serieux | libre | nouveau (19/10) — la page Santé ignore les éditions, les journaux Vercel ne vivent qu'une heure |
| T-161 | L'atelier s'ouvrait sans mot de passe, avec un faux cookie au nom d'une propriété héritée | admin | bloquant | libre | **fermé** (fiche dans `fermes/`) — 19/10 : trouvé par l'audit, corrigé le jour même (PR #249), prouvé en production (`307 → /admin/login`) ; aucune écriture d'intrus en base ; `/admin` se garde aussi seule (PR #250) |
| T-162 | Next.js 16.2.3 et cinq autres dépendances portent des failles connues, dont des contournements du middleware | exploitation | serieux | libre | en cours (19/10) — Next.js passé en 16.4.2 (critique et contournements fermés) ; reste pdfjs-dist avec `public/pdfjs/`, sharp, source-map-js |
| T-163 | Le site n'envoie aucun en-tête de protection, l'atelier peut être affiché dans la page d'un autre site | exploitation | serieux | libre | nouveau (19/10) — ni CSP ni `X-Frame-Options`, vérifié au `curl` |
| T-164 | Les liens des mails d'une édition prennent leur adresse dans un en-tête de la requête, que l'appelant peut écrire | collectif | serieux | libre | nouveau (19/10) — sans effet tant que `COLLECTIF_MAILS` est fermé ; à faire AVANT de l'ouvrir |
| T-165 | Un logo SVG déposé par un client exécute son script si l'atelier l'ouvre dans un nouvel onglet | collectif | confort | libre | nouveau (19/10) — domaine R2, pas bellajour.fr ; servir en téléchargement |
| T-166 | « Retrouver mon espace » n'a aucun frein par appelant, une fois les mails ouverts elle peut servir à arroser de vraies adresses | collectif | confort | libre | nouveau (19/10) — avec T-164, avant d'ouvrir `COLLECTIF_MAILS` |
| T-167 | Au-delà de 1 000 photos, une édition perdrait des photos sans rien dire (grille, plafond total, lot de l'atelier) | collectif | serieux | libre | **fermé** (fiche dans `fermes/`) — 19/10, PR #271 : lecture par tranches de 1 000 (jusqu'à 100 000), comptes en base, lot vérifié |
| T-168 | Chaque envoi de photos relit toutes les photos de l'édition, la charge croît au carré du nombre de photos | collectif | serieux | libre | en cours — l'envoi compte en base (PR #271) ; reste la grille, le tableau de bord et la fiche qui relisent toutes les photos |
| T-169 | La messagerie interroge le serveur toutes les 3,5 secondes, même quand rien ne bouge | collectif | serieux | libre | nouveau (19/10) — ≈ 180 000 appels par mois et par onglet ouvert (calculé), quota Hobby à vérifier |
| T-170 | Le repérage des doublons devient très lent quand beaucoup de photos sont identiques, jusqu'à bloquer la grille | collectif | serieux | libre | nouveau (19/10) — 16 s pour 1 000 empreintes identiques (mesuré) |
| T-171 | Une photo dont la vignette a échoué s'affiche dans la grille en original, et rien ne refait la vignette | collectif | confort | libre | en cours — vignette renvoyée après coupure (PR #271) ; reste la vignette refaite côté serveur |
| T-172 | Le mur des styles affiche les images maîtresses (jusqu'à 2 400 px et 4 Mo) dans des cartes de 300 px | collectif | serieux | libre | nouveau (19/10) — premier écran du client, poids réel non mesuré |
| T-173 | La page Documents charge tout le tableau de bord pour afficher le nom des magazines | collectif | confort | libre | nouveau (19/10) |
| T-174 | La page produit précharge 333 Ko qu'elle n'utilise pas, un quart des données mobiles | front | confort | libre | nouveau (19/10) — mesuré en mobile lent |
| T-175 | Sur téléphone lent, le titre de la page produit reste invisible trois secondes après l'apparition de la barre | front | confort | libre | nouveau (19/10) — le mouvement est voulu : maquette à montrer avant de toucher |
| T-176 | Les vignettes de photos sont retéléchargées à chaque visite, faute de cache | exploitation | confort | libre | nouveau (19/10) |
| T-177 | Le bon à tirer, la boîte de réception de l'atelier et le fil des messages attendent des lectures l'une après l'autre sans raison | collectif | confort | libre | nouveau (19/10) |
| T-178 | Six composants appellent setState directement dans un effet, ce que la nouvelle règle de lint de React refuse | front | confort | libre | nouveau (19/10) — `eslint-config-next` gardé en 16.2.3 en attendant |
| T-179 | Sur le mur des styles, la composition en colonne à droite et les choix faits ne se lisent pas | collectif | serieux | libre | en cours — livré le 19/10 (PR #262, planches 1 et 2) ; reste la recette de Mathias (plusieurs magazines, un vrai iPhone) |
| T-180 | Le prénom d'un participant n'apparaît pas tant qu'il est seul sur un lien, et on ne peut pas trier les photos par personne partout | collectif | serieux | libre | en cours — livré le 19/10 (PR #258, planche 3) ; reste la recette de Mathias |
| T-181 | Le responsable ne voit les photos des participants arriver qu'en rechargeant la page | collectif | serieux | libre | en cours — livré le 19/10 (PR #258) ; reste à voir une vraie arrivée pendant que l'écran est ouvert (simulée au pilote) |
| T-182 | Le responsable ne peut pas dire « toutes les photos sont là », et l'atelier ne voit pas sa sélection | collectif | serieux | libre | en cours — livré le 19/10 (PR #259, D25) ; reste une vraie collecte terminée (le clic a été intercepté) |
| T-183 | La sélection des photos n'est pas claire, et on ne sait pas encore comment les clients choisiront | collectif | confort | libre | en pause (19/10) — à observer sur les premières vraies éditions |
| T-184 | L'accord que coche chaque participant avant d'envoyer ses photos n'est enregistré nulle part | collectif | serieux | avis-requis | en cours — migration `20261020_collectif_accord_participant.sql` appliquée par Mathias le 19/10 (colonnes vérifiées en lecture), PR #266 fusionnée APRÈS elle ; reste : voir sur un premier vrai dépôt de participant que l'accord arrive en base |
| T-185 | Dans la fiche d'une édition, les onglets ne sont pas bâtis comme la vue d'ensemble et paraissent brouillons | collectif | serieux | libre | en cours — livré le 19/10 (PR #260 et #263, planche 7 complète) ; reste la recette de Mathias |
| T-186 | Le formulaire de création d'une édition cache ce que font ses dates et ses cases, et une de ses aides est fausse | collectif | serieux | libre | en cours — livré le 19/10 (PR #263, planche 5) ; reste la recette de Mathias |
| T-187 | Après la création d'une édition, rien ne propose d'envoyer les liens, et le mail prévu ne porte pas le lien de l'équipe | collectif | serieux | avis-requis | en cours — livré le 19/10 (PR #263, planche 6) ; `COLLECTIF_MAILS` FERMÉ : l'envoi attend l'accord de Mathias |
| T-188 | Dans la messagerie de l'atelier, on ne voit ni quels messages sont nouveaux, ni qu'un message arrive sans recharger | collectif | serieux | libre | en cours — livré le 19/10 (PR #261, planche 8) ; reste un vrai message non lu (montré sur données fournies) |
| T-189 | Les dates du formulaire d'une édition passent par le calendrier du navigateur, et les dates de l'événement ne sont qu'un texte | collectif | confort | libre | en cours — livré le 19/10 au soir (PR #267, planche 9) ; reste la recette de Mathias |
| T-190 | Dans le formulaire d'une édition, on ne retire que le dernier magazine, les chiffres ont les flèches du navigateur, et rien ne montre où va le message d'accueil | collectif | confort | libre | en cours — livré le 19/10 au soir (PR #267, planches 10 et 11) ; reste la recette (la suppression d'un magazine vide n'a été vue qu'au harnais) |
| T-191 | L'atelier ne peut demander au client que cinq contenus figés, sans choisir leur nom ni les fichiers acceptés | collectif | serieux | avis-requis | en cours — livré le 19/10 au soir (PR #268, planche 12) ; **migration `20261021_collectif_demandes.sql` à appliquer par Mathias** (sans elle, une demande nouvelle répond 503) |
| T-192 | Avant la première vraie édition (Audencia), l'envoi des photos perdait ou doublait des photos sur iPhone et en mauvais réseau, le nom des participants changeait, et le mur des styles montrait des visuels pas prêts | collectif | serieux | libre | en cours — PR #271 en production, essai réel 324/324 sans doublon ; reste un vrai iPhone, un vrai Samsung, l'écran verrouillé (T-155) |
| T-193 | L'atelier ne retrouve pas les bateaux, ni regroupement ni téléchargement par lien, et le nom des fichiers ne dit ni la personne ni le lien | collectif | serieux | libre | nouveau (20/10) — AVANT Audencia |
| T-194 | Une photo arrivée au coffre mais pas encore confirmée (page fermée, téléphone verrouillé) reste invisible pour toujours | collectif | serieux | libre | nouveau (20/10) — AVANT Audencia |
| T-195 | Un plafond total laissé vide ferme le dépôt pour tout le monde, et le participant ne l'apprend qu'après avoir choisi ses photos | collectif | serieux | libre | nouveau (20/10) — AVANT Audencia |
| T-196 | Régénérer le lien des participants coupe d'un coup tous les liens de contribution, sans prévenir | collectif | serieux | libre | nouveau (20/10) — AVANT Audencia |
| T-197 | Le grand QR code « à projeter ou à imprimer » existe mais aucun écran ne l'ouvre | collectif | confort | libre | nouveau (20/10) |
| T-198 | Le nom d'un participant ne se corrige nulle part, et « Léa » et « Lea » font deux personnes | collectif | confort | libre | nouveau (20/10) |
| T-199 | Le responsable ne peut ni agrandir, ni signaler, ni retirer une photo, et personne ne peut supprimer une photo déposée | collectif | serieux | avis-requis | nouveau (20/10) — la suppression attend Mathias |
| T-200 | Les vidéos sont refusées avec « ce ne sont pas des photos », sans que la page le dise avant le choix | collectif | confort | libre | nouveau (20/10) — décision de Mathias : refuser en le disant, ou accepter |
| T-201 | L'atelier ne voit pas les liens de contribution d'une édition et ne peut pas en créer | collectif | confort | libre | nouveau (20/10) |
| T-202 | Les sauvegardes de la base et des photos, et les plans d'hébergement adaptés à un usage commercial, ne sont pas confirmés avant le premier vrai client | collectif | serieux | avis-requis | nouveau (20/10) — dépense : Mathias tranche |
