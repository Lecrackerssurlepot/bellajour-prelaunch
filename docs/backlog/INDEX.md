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

## Où on en est (10/09/2026, après le chantier « grille par pages »)

**Six PR le même jour (#99 → #103), trois tickets fermés (T-006, T-072, T-074), un ouvert (T-106, la politique de livraison), 34 encore ouverts,
aucun bloquant.** La grille finale de Mathias est en production (un prix par nombre de pages, 25 à
59 €), le prix se gèle sur le dossier, le pays est demandé à l'écran 4, la livraison est facturée
en sus par devis Cloudprinter, les CGV sont en v3.1. **Ce qui bloque maintenant est chez Mathias** :
la migration `20260910_atelier_prix_gele.sql` (sans elle, aucun aperçu ne peut être vendu), le
plafond de livraison, la règle HT → TTC du port, et la poussée des templates M3/M3b/M10 vers Brevo.
Le détail daté est dans `docs/reference/ETAT-PRODUCTION.md`.

## Où on en était (08/09/2026, après la séance « on finit tout »)

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
| T-027 | Les finitions d'impression sont posées par défaut, pas choisies | produit | serieux | avis-requis | nouveau |
| T-028 | La page produit affirme un grammage qu'on n'a pas mesuré | produit | serieux | avis-requis | nouveau |
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
| T-069 | L'image de partage promet un album, et peut casser le déploiement entier | front | serieux | avis-requis | en cours — le `throw` qui cassait le build est retiré (repli, 01/09) ; **reste le visuel** (avec le chantier visuels) + rendre son image à `/ambassadeurs` |
| T-070 | Le retour des pages légales renvoie sur une page supprimée | front | confort | libre | **fermé** |
| T-071 | Personne ne serait prévenu si Google rejetait le site | exploitation | confort | avis-requis | nouveau |
| T-072 | Les prix finaux du magazine ne sont pas tranchés | paiement | serieux | avis-requis | **fermé** (10/09 : grille finale de Mathias dans `grille.ts`, livraison en sus, prix gelé) |
| T-073 | Commander plusieurs exemplaires, avec des paliers dégressifs à fournir | paiement | serieux | avis-requis | en pause (30/08, verrou à 1 posé — attend les paliers de Mathias) |
| T-074 | Un prix selon le pays de livraison exige de demander le pays avant le prix | produit | serieux | avis-requis | **fermé** (10/09 : pays demandé à l'écran 4, livraison par devis selon le pays) |
| T-075 | Les ventes de l'atelier ne passent pas par la comptabilité InvoiceXpress | paiement | serieux | avis-requis | nouveau |
| T-076 | Les dossiers abandonnés gardent leurs données personnelles sans limite de durée | donnees | serieux | avis-requis | **rétention armée le 02/09** — migration appliquée, template M10 poussé (ID 40), `BREVO_TEMPLATE_M10_ID` live en prod (Santé sans alerte). Reste seulement, différé exprès : un cron une fois éprouvé, et exclure les anonymisés de T-023 |
| T-077 | Les specs d'impression des deux produits Cloudprinter ne sont pas sur le disque | produit | serieux | avis-requis | en pause (01/09, rejoint le lot CGV) |
| T-078 | Aucun moteur ne transforme les gabarits de mise en page en PDF imprimable | atelier | serieux | avis-requis | en cours — étape 0 livrée le 30/08, la suite dépend de T-077 |
| T-079 | Le dashboard métriques n'a pas d'insights ni de stratégie assistés par IA | admin | confort | avis-requis | en pause (30/08, le bloc « Lecture » suffit — attendre ~50 dossiers) |
| T-080 | Le dashboard métriques mérite un vrai design de tableau de bord | admin | confort | libre | en cours (07/09) — rendu sorti de la page (Vue.tsx, pour pouvoir le REGARDER sans base ni session) + rangée de quatre chiffres clés en tête. L habillage fin attend la référence visuelle de Mathias |
| T-081 | Rien ne compare les paiements Stripe aux dossiers de la base | paiement | serieux | avis-requis | en cours — **lancé sur la vraie base le 08/09**, deux passes en lecture seule : 0 écart en livemode, et 2 écarts levés en `--avec-test` (dossiers de recette supprimés). Le filet est prouvé DÉTECTEUR. Reste le seul choix du déclencheur : Vercel Hobby n'autorise qu'un cron/jour, déjà pris par la relève |
| T-082 | Les lectures de `CHAMPS_MAIL` n'ont pas le repli 42703 que le reste du code a | donnees | serieux | libre | **fermé** (fiche dans `fermes/`) — corrigé le 02/09 : helper `lireNumerosMail` (repli sur `CHAMPS_MAIL_REPLI`) sur les 5 lieux de lecture. Dormant tant que les colonnes existent. tsc+lint+build+harnais verts |
| T-083 | Les CGV portugaises n'ont pas d'URL à elles et sont invisibles pour Google | front | serieux | libre | **fermé** (fiche dans `fermes/`) — fait le 03/09 : URL par langue (`/en/cgv`, `/pt/cgv`), canonical auto-référent + hreflang/x-default, `?lang=` en 308 (ref préservé), sitemap. Aucun texte légal touché. tsc+lint+build + runtime verts |
| T-084 | Deux dossiers ouverts pour la même adresse ne sont signalés nulle part | admin | serieux | libre | **fermé** (fiche dans `fermes/`) — part 1 (constat Santé orange, sur `email_canonical`) livrée le 02/09 (PR #27) ; part 2 (lien sur la fiche) existait déjà (« Ses autres numéros »). tsc+lint+harnais verts, détection validée sur la base |
| T-085 | La fiche produit de `/magazine` n'a ni image conforme ni conditions marchandes | produit | serieux | avis-requis | nouveau |
| T-086 | Sur desktop, la bande « étapes 1-2-3 » occupe un espace sans rapport avec son contenu | front | confort | avis-requis | **fermé** (fiche dans `fermes/`) — livré le 07/09, prouvé dans `main` le 08/09 (`content.ts:67-68`, `Kiosque.tsx:194`, branche fusionnée) |
| T-087 | Sur téléphone, le prix de la PDP est compressé à la limite de la lisibilité | front | confort | libre | **fermé** (fiche dans `fermes/`) — fait le 03/09 : libellés des cartes remontés (`.combien` 10→11 px, `.pages` 11→12 px), interlignes resserrés pour ne PAS bouger le bouton (delta 0 mesuré à 375×667). build vert |
| T-088 | Le logo en haut du questionnaire et de la page cliente est un clic mort | front | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — livré le 07/09, prouvé dans `main` le 08/09 (`Composer.tsx:443,497,505`, branche fusionnée). `/numero` non touché, choix produit documenté |
| T-089 | La maquette que reçoit le client — visionneuse multi-format façon magazine | front | serieux | avis-requis | en cours — prototype v3 + fondation (#28) + **visionneuse `/numero` livrée (PR #29, rendu réel validé)** ; reste l'admin (T-090) et les vrais visuels |
| T-090 | Admin — planche couverture, découpage centré, doubles pages à la demande, drag-and-drop | admin | serieux | avis-requis | **fermé** (fiche dans `fermes/`) — livré (PR #33) : dépôt de la planche, 0 à 3 doubles pages réordonnables au glissé, restitution fidèle sur la fiche. Le curseur de coupe reste écarté (centre auto, décision Mathias) ; le recadrage intra-page est demandé le 07/09 et reste à faire ; **le recadrage intra-page est livré le 08/09** : la planche était coupée par deux ancres CSS fixes, elle a maintenant deux réglages indépendants (C1 et C4 sont deux faces du même fichier), sans migration — tout vit dans le `jsonb` `apercu_urls.cadrages`. Sans geste de l'atelier, l'affichage est pixel pour pixel l'ancien |
| T-091 | Réagir à la maquette, pas seulement partir — thèmes + freestyle | produit | serieux | avis-requis | en cours — feuille d'ajustement livrée (PR #30/#31) + mots de couverture facultatifs (03/09). **Reste les 5 thèmes**, en attente des visuels de Mathias (07/09) |
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
| T-106 | La politique de livraison facturée au client (plafond, tarif fixe ou port compris) n'est pas tranchée | paiement | serieux | avis-requis | nouveau (10/09) — le client paie le devis Cloudprinter complet (11,06 € TTC pour la France) tant que le plafond n'est pas posé ; attend Mathias et Louis |
| T-107 | Les mails mettent 5 à 9 minutes à arriver, alors que le site les soumet à la seconde | atelier | serieux | avis-requis | nouveau (11/09) — mesuré 5 min 07 s à 8 min 57 s sur trois mails, MAIS 2 s sur le M3 de Klervie le même jour : le retard est INTERMITTENT, pas structurel. Caractériser avant de payer un plan |
| T-108 | Un test automatisé a créé un vrai dossier et envoyé un vrai mail | atelier | serieux | libre | **fermé** (11/09, PR #124 : `ATELIER_MAILS_COUPES` dans les deux chemins d'envoi) |
