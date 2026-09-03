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

| id | titre | domaine | gravite | autonomie | etat |
|---|---|---|---|---|---|
| T-001 | Le numéro de suivi n'est jamais enregistré | donnees | bloquant | avis-requis | **fermé** |
| T-002 | Les liens de parrainage des mails vivants sont morts | contenu | serieux | avis-requis | en pause (31/08, stratégie consignée dans la fiche) |
| T-003 | 101 Mo d'images orphelines déployées à chaque build | front | serieux | libre | **à fermer** — fait le 02/09 : `prevente/` (dont 5 `.mp4`) et `solution/` déplacés en `archive/public-orphelins/`, `public/` de 22→9 Mo. Le « 101 Mo » était périmé (le gros avait déjà disparu). tsc+lint+build verts |
| T-004 | La page d'état de la cliente est indexable par Google | front | serieux | libre | **refuse** (31/08, le noindex existait déjà) |
| T-005 | L'ancien mot de passe admin partagé ouvre encore la porte | admin | serieux | libre | **fermé** |
| T-006 | Un album de 29 pages n'est couvert par aucune ligne des CGV | produit | serieux | avis-requis | nouveau |
| T-007 | Un mail sans template se saute en silence, à l'infini | atelier | serieux | libre | **fermé** |
| T-008 | Le rate-limit ne limite rien sur Vercel | paiement | serieux | libre | nouveau |
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
| T-019 | La barre de l'accueil n'a pas son repli Android | front | confort | avis-requis | nouveau |
| T-020 | On ne saurait pas qu'une visiteuse décroche | exploitation | serieux | avis-requis | **actif le 02/09** — Web Analytics + Speed Insights activés, scripts servis en 200 sur la prod (vérifié). Masquage des tokens live |
| T-021 | Le crédit fondateur de 30 € est entièrement manuel | paiement | serieux | avis-requis | en cours — automatique depuis le 01/09, jamais éprouvé contre Stripe |
| T-022 | Les mails tombent dans l'onglet Promotions de Gmail | exploitation | serieux | avis-requis | en pause (31/08, tranché : la maquette reste telle quelle) |
| T-023 | 734 photos orphelines dorment sur R2 | donnees | confort | avis-requis | nouveau — doit ignorer les dossiers anonymisés (T-076) |
| T-024 | La page Santé crie sur une base vide | admin | confort | libre | **fermé** |
| T-025 | Cinq mails n'ont jamais été envoyés en vrai | atelier | serieux | avis-requis | nouveau |
| T-026 | Les CGV v3.0 n'ont pas été relues par un juriste | produit | serieux | avis-requis | nouveau |
| T-027 | Les finitions d'impression sont posées par défaut, pas choisies | produit | serieux | avis-requis | nouveau |
| T-028 | La page produit affirme un grammage qu'on n'a pas mesuré | produit | serieux | avis-requis | nouveau |
| T-029 | Deux avertissements de lint traînent depuis le lot 7 | exploitation | confort | libre | **fermé** |
| T-030 | Vérifier si la couverture d'un seul tenant est déjà livrée | atelier | confort | libre | nouveau |
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
| T-048 | La garantie « pas d'objet sans ligne » n'existe pas vraiment | donnees | confort | libre | **à fermer** — corrigé le 01/09 (`r2.supprimer` rend un booléen, la route garde la ligne sur échec R2 et renvoie 500). tsc+lint+build+harnais verts |
| T-049 | L'adresse de retour après paiement n'est pas vérifiée | paiement | serieux | avis-requis | **à fermer** — corrigé le 02/09 : `originDeConfiance` (liste blanche + repli gracieux sur `SITE_URL`) sur `/api/atelier/checkout`. Même défaut DORMANT sur `/api/checkout` (prévente close) noté dans la fiche. tsc+lint+build verts |
| T-050 | Sans JavaScript, le site sert un écran noir — y compris la page qui fait payer | front | bloquant | libre | **fermé** |
| T-051 | Le questionnaire est muet pour qui n'utilise pas la souris | front | serieux | libre | **fermé** |
| T-052 | On refuse une histoire trop courte sans jamais dire qu'elle est trop courte | front | serieux | libre | **fermé** |
| T-053 | Les seuls libellés de l'écran des coordonnées sont illisibles | front | serieux | libre | **fermé** |
| T-054 | Une photo qui n'est pas partie ne se voit pas, et le bouton reste actif | front | serieux | libre | **fermé** |
| T-055 | La loupe laisse atteindre le bouton payer, invisible sous le fond noir | front | serieux | libre | **fermé** (reste à voir à l'œil : recette) |
| T-056 | La page qui suit le paiement se recharge cinq fois sans prévenir | front | serieux | libre | **fermé** (reste à voir à l'œil : recette) |
| T-057 | Les CGV portugaises, qui font foi, sont servies dans un document déclaré français | produit | serieux | libre | **fermé** (le reste → T-083) |
| T-058 | Un lien de reprise tronqué fait recommencer tout, et crée un second dossier | atelier | serieux | libre | **fermé** (le reste → T-084) |
| T-059 | Une police jamais peinte retarde l'apparition du premier écran | front | serieux | libre | **à fermer** — corrigé le 30/08 (commit `0a765a3`, italique sortie du layout), prouvé au build par l'audit du 01/09 |
| T-060 | 164 Ko d'images du deuxième écran descendent pendant que le premier s'affiche | front | serieux | libre | **fermé** |
| T-061 | Le chemin de fer fait saccader le téléphone alors qu'il n'y est pas affiché | front | serieux | libre | **à fermer** — corrigé le 30/08 (commit `0a765a3`, `matchMedia` miroir de la media query), prouvé par l'audit du 01/09 |
| T-062 | Le grain refond l'écran entier à chaque frame de défilement | front | serieux | libre | nouveau |
| T-063 | 62 % de la feuille servie sur tout le site vise des pages archivées | front | confort | libre | en cours — dead code retiré (30/08) ; restent 2 règles globales, `/magazine` déjà protégé (audit 01/09) |
| T-064 | Trente déclarations de police jamais peintes bloquent le rendu de chaque page | front | confort | libre | nouveau — constat re-vérifié le 31/08, correctif non commencé |
| T-065 | Aucune image du site n'a de variante pour téléphone | front | serieux | libre | **fermé** |
| T-066 | Ouvrir le questionnaire télécharge tout le moteur d'envoi de photos | front | serieux | libre | **à fermer** — fait le 02/09 : écrans 5 ET 6 en `next/dynamic` (l'écran 6 tirait aussi le moteur), moteur absent du chunk initial, worker servi en 200, reprise OK. Vérifié sur build prod. tsc+lint+build verts |
| T-067 | Une page indexable vend encore un programme qu'on n'honore plus | produit | serieux | avis-requis | nouveau |
| T-068 | Le site déclare deux fiches produit concurrentes pour un seul produit | front | serieux | libre | **fermé** (le reste → T-085) |
| T-069 | L'image de partage promet un album, et peut casser le déploiement entier | front | serieux | avis-requis | en cours — le `throw` qui cassait le build est retiré (repli, 01/09) ; **reste le visuel** (avec le chantier visuels) + rendre son image à `/ambassadeurs` |
| T-070 | Le retour des pages légales renvoie sur une page supprimée | front | confort | libre | **fermé** |
| T-071 | Personne ne serait prévenu si Google rejetait le site | exploitation | confort | avis-requis | nouveau |
| T-072 | Les prix finaux du magazine ne sont pas tranchés | paiement | serieux | avis-requis | nouveau |
| T-073 | Commander plusieurs exemplaires, avec des paliers dégressifs à fournir | paiement | serieux | avis-requis | en pause (30/08, verrou à 1 posé — attend les paliers de Mathias) |
| T-074 | Un prix selon le pays de livraison exige de demander le pays avant le prix | produit | serieux | avis-requis | nouveau |
| T-075 | Les ventes de l'atelier ne passent pas par la comptabilité InvoiceXpress | paiement | serieux | avis-requis | nouveau |
| T-076 | Les dossiers abandonnés gardent leurs données personnelles sans limite de durée | donnees | serieux | avis-requis | **rétention armée le 02/09** — migration appliquée, template M10 poussé (ID 40), `BREVO_TEMPLATE_M10_ID` live en prod (Santé sans alerte). Reste seulement, différé exprès : un cron une fois éprouvé, et exclure les anonymisés de T-023 |
| T-077 | Les specs d'impression des deux produits Cloudprinter ne sont pas sur le disque | produit | serieux | avis-requis | en pause (01/09, rejoint le lot CGV) |
| T-078 | Aucun moteur ne transforme les gabarits de mise en page en PDF imprimable | atelier | serieux | avis-requis | en cours — étape 0 livrée le 30/08, la suite dépend de T-077 |
| T-079 | Le dashboard métriques n'a pas d'insights ni de stratégie assistés par IA | admin | confort | avis-requis | en pause (30/08, le bloc « Lecture » suffit — attendre ~50 dossiers) |
| T-080 | Le dashboard métriques mérite un vrai design de tableau de bord | admin | confort | libre | nouveau |
| T-081 | Rien ne compare les paiements Stripe aux dossiers de la base | paiement | serieux | avis-requis | en cours — script de rapprochement livré le 02/09 (`scripts/reconcilier-stripe.ts`, lecture seule, tsc+lint verts). Reste : le lancer sur la vraie base, puis décider d'un cron |
| T-082 | Les lectures de `CHAMPS_MAIL` n'ont pas le repli 42703 que le reste du code a | donnees | serieux | libre | **à fermer** — corrigé le 02/09 : helper `lireNumerosMail` (repli sur `CHAMPS_MAIL_REPLI`) sur les 5 lieux de lecture. Dormant tant que les colonnes existent. tsc+lint+build+harnais verts |
| T-083 | Les CGV portugaises n'ont pas d'URL à elles et sont invisibles pour Google | front | serieux | libre | **à fermer** — fait le 03/09 : URL par langue (`/en/cgv`, `/pt/cgv`), canonical auto-référent + hreflang/x-default, `?lang=` en 308 (ref préservé), sitemap. Aucun texte légal touché. tsc+lint+build + runtime verts |
| T-084 | Deux dossiers ouverts pour la même adresse ne sont signalés nulle part | admin | serieux | libre | **à fermer** — part 1 (constat Santé orange, sur `email_canonical`) livrée le 02/09 (PR #27) ; part 2 (lien sur la fiche) existait déjà (« Ses autres numéros »). tsc+lint+harnais verts, détection validée sur la base |
| T-085 | La fiche produit de `/magazine` n'a ni image conforme ni conditions marchandes | produit | serieux | avis-requis | nouveau |
| T-086 | Sur desktop, la bande « étapes 1-2-3 » occupe un espace sans rapport avec son contenu | front | confort | avis-requis | nouveau (retour Mathias 01/09, prouvé par l'audit) |
| T-087 | Sur téléphone, le prix de la PDP est compressé à la limite de la lisibilité | front | confort | libre | **à fermer** — fait le 03/09 : libellés des cartes remontés (`.combien` 10→11 px, `.pages` 11→12 px), interlignes resserrés pour ne PAS bouger le bouton (delta 0 mesuré à 375×667). build vert |
| T-088 | Le logo en haut du questionnaire et de la page cliente est un clic mort | front | serieux | avis-requis | nouveau (retour Mathias 01/09, prouvé par l'audit) |
| T-089 | La maquette que reçoit le client — visionneuse multi-format façon magazine | front | serieux | avis-requis | en cours — prototype v3 + fondation (#28) + **visionneuse `/numero` livrée (PR #29, rendu réel validé)** ; reste l'admin (T-090) et les vrais visuels |
| T-090 | Admin — planche couverture, découpage centré, doubles pages à la demande, drag-and-drop | admin | serieux | avis-requis | nouveau (02/09) |
| T-091 | Réagir à la maquette, pas seulement partir — thèmes + freestyle | produit | serieux | avis-requis | nouveau (02/09) |
| T-092 | Refonte du parcours questionnaire — logo officiel + Q1 à Q5 | front | serieux | avis-requis | nouveau (02/09, cahier des charges de Mathias) |
| T-093 | Plusieurs couvertures proposées, la cliente choisit sa préférée | produit | serieux | avis-requis | nouveau (02/09) ; mot « tout reste modifiable » déjà dans le prototype |
