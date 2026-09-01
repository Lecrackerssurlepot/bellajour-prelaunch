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
| T-003 | 101 Mo d'images orphelines déployées à chaque build | front | serieux | libre | nouveau |
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
| T-020 | On ne saurait pas qu'une visiteuse décroche | exploitation | serieux | avis-requis | en cours — branché et **inerte** (01/09), attend le clic « Enable » de Mathias |
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
| T-048 | La garantie « pas d'objet sans ligne » n'existe pas vraiment | donnees | confort | libre | nouveau |
| T-049 | L'adresse de retour après paiement n'est pas vérifiée | paiement | serieux | avis-requis | nouveau |
| T-050 | Sans JavaScript, le site sert un écran noir — y compris la page qui fait payer | front | bloquant | libre | **fermé** |
| T-051 | Le questionnaire est muet pour qui n'utilise pas la souris | front | serieux | libre | **fermé** |
| T-052 | On refuse une histoire trop courte sans jamais dire qu'elle est trop courte | front | serieux | libre | **fermé** |
| T-053 | Les seuls libellés de l'écran des coordonnées sont illisibles | front | serieux | libre | **fermé** |
| T-054 | Une photo qui n'est pas partie ne se voit pas, et le bouton reste actif | front | serieux | libre | **fermé** |
| T-055 | La loupe laisse atteindre le bouton payer, invisible sous le fond noir | front | serieux | libre | **fermé** (reste à voir à l'œil : recette) |
| T-056 | La page qui suit le paiement se recharge cinq fois sans prévenir | front | serieux | libre | **fermé** (reste à voir à l'œil : recette) |
| T-057 | Les CGV portugaises, qui font foi, sont servies dans un document déclaré français | produit | serieux | libre | **fermé** (le reste → T-083) |
| T-058 | Un lien de reprise tronqué fait recommencer tout, et crée un second dossier | atelier | serieux | libre | **fermé** (le reste → T-084) |
| T-059 | Une police jamais peinte retarde l'apparition du premier écran | front | serieux | libre | nouveau — `preload: false` essayé le 31/08, **sans effet mesurable** |
| T-060 | 164 Ko d'images du deuxième écran descendent pendant que le premier s'affiche | front | serieux | libre | **fermé** |
| T-061 | Le chemin de fer fait saccader le téléphone alors qu'il n'y est pas affiché | front | serieux | libre | nouveau |
| T-062 | Le grain refond l'écran entier à chaque frame de défilement | front | serieux | libre | nouveau |
| T-063 | 62 % de la feuille servie sur tout le site vise des pages archivées | front | serieux | libre | nouveau |
| T-064 | Trente déclarations de police jamais peintes bloquent le rendu de chaque page | front | confort | libre | nouveau — constat re-vérifié le 31/08, correctif non commencé |
| T-065 | Aucune image du site n'a de variante pour téléphone | front | serieux | libre | **fermé** |
| T-066 | Ouvrir le questionnaire télécharge tout le moteur d'envoi de photos | front | serieux | libre | nouveau — repéré le 31/08 (pièges notés), découpage non commencé |
| T-067 | Une page indexable vend encore un programme qu'on n'honore plus | produit | serieux | avis-requis | nouveau |
| T-068 | Le site déclare deux fiches produit concurrentes pour un seul produit | front | serieux | libre | **fermé** (le reste → T-085) |
| T-069 | L'image de partage promet un album, et peut casser le déploiement entier | front | serieux | avis-requis | en pause (01/09, Mathias : avec le chantier visuels) |
| T-070 | Le retour des pages légales renvoie sur une page supprimée | front | confort | libre | **fermé** |
| T-071 | Personne ne serait prévenu si Google rejetait le site | exploitation | confort | avis-requis | nouveau |
| T-072 | Les prix finaux du magazine ne sont pas tranchés | paiement | serieux | avis-requis | nouveau |
| T-073 | Commander plusieurs exemplaires, avec des paliers dégressifs à fournir | paiement | serieux | avis-requis | en pause (30/08, verrou à 1 posé — attend les paliers de Mathias) |
| T-074 | Un prix selon le pays de livraison exige de demander le pays avant le prix | produit | serieux | avis-requis | nouveau |
| T-075 | Les ventes de l'atelier ne passent pas par la comptabilité InvoiceXpress | paiement | serieux | avis-requis | nouveau |
| T-076 | Les dossiers abandonnés gardent leurs données personnelles sans limite de durée | donnees | serieux | avis-requis | en cours — livré et **inerte** : migration à appliquer, M10 à pousser |
| T-077 | Les specs d'impression des deux produits Cloudprinter ne sont pas sur le disque | produit | serieux | avis-requis | en pause (01/09, rejoint le lot CGV) |
| T-078 | Aucun moteur ne transforme les gabarits de mise en page en PDF imprimable | atelier | serieux | avis-requis | en cours — étape 0 livrée le 30/08, la suite dépend de T-077 |
| T-079 | Le dashboard métriques n'a pas d'insights ni de stratégie assistés par IA | admin | confort | avis-requis | en pause (30/08, le bloc « Lecture » suffit — attendre ~50 dossiers) |
| T-080 | Le dashboard métriques mérite un vrai design de tableau de bord | admin | confort | libre | nouveau |
| T-081 | Rien ne compare les paiements Stripe aux dossiers de la base | paiement | serieux | avis-requis | nouveau |
| T-082 | Les lectures de `CHAMPS_MAIL` n'ont pas le repli 42703 que le reste du code a | donnees | serieux | libre | nouveau |
| T-083 | Les CGV portugaises n'ont pas d'URL à elles et sont invisibles pour Google | front | serieux | libre | nouveau |
| T-084 | Deux dossiers ouverts pour la même adresse ne sont signalés nulle part | admin | serieux | libre | nouveau |
| T-085 | La fiche produit de `/magazine` n'a ni image conforme ni conditions marchandes | produit | serieux | avis-requis | nouveau |
