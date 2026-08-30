# Backlog — ce qui reste

Un fichier par ticket dans ce dossier. Les tickets fermés partent dans `fermes/`.
Ordre de lecture : gravité, puis ce qui débloque le plus.

**Gravité** — `bloquant` : une cliente en subit l'effet, ou de l'argent/une donnée est en jeu.
`serieux` : ça nous coûtera avant le lancement. `confort` : dette, propreté, on ship sans.
**Autonomie** — `libre` : je fais. `avis-requis` : je prépare, Mathias tranche (mails, prix,
migrations en production, texte légal, impression, suppression de données).

Semé le 29/08/2026 par l'audit de structure. Tous les tickets ci-dessous sont **prouvés dans le
code** (chemin + ligne dans chaque fiche), aucun n'est une intuition.

| id | titre | domaine | gravite | autonomie | etat |
|---|---|---|---|---|---|
| T-001 | Le numéro de suivi n'est jamais enregistré | donnees | bloquant | avis-requis | **fermé** |
| T-002 | Les liens de parrainage des mails vivants sont morts | contenu | bloquant | avis-requis | nouveau |
| T-003 | 101 Mo d'images orphelines déployées à chaque build | front | serieux | libre | nouveau |
| T-004 | La page d'état de la cliente est indexable par Google | front | serieux | libre | nouveau |
| T-005 | L'ancien mot de passe admin partagé ouvre encore la porte | admin | serieux | libre | nouveau |
| T-006 | Un album de 29 pages n'est couvert par aucune ligne des CGV | produit | serieux | avis-requis | nouveau |
| T-007 | Un mail sans template se saute en silence, à l'infini | atelier | serieux | libre | nouveau |
| T-008 | Le rate-limit ne limite rien sur Vercel | paiement | serieux | libre | nouveau |
| T-009 | Aucune page n'a de canonical | front | serieux | libre | nouveau |
| T-010 | Rien ne vérifie le code avant un commit | exploitation | serieux | libre | **fermé** |
| T-011 | `.env.example` cache douze variables vivantes | exploitation | serieux | libre | **fermé** |
| T-012 | Trente `catch` muets sur des chemins qui écrivent | atelier | serieux | libre | nouveau |
| T-013 | Les pages animées ignorent « réduire les animations » | front | confort | libre | **fermé** |
| T-014 | Le sitemap ment sur ses dates | front | confort | libre | nouveau |
| T-015 | Deux modules morts traînent dans le code vivant | exploitation | confort | libre | nouveau |
| T-016 | Les quatre composants de l'ancienne accueil ont fini leur office | front | confort | libre | nouveau |
| T-017 | Le focus au clavier est invisible sur la moitié du site | front | confort | libre | **fermé** |
| T-018 | Trois fichiers sans rôle sont servis publiquement | exploitation | confort | libre | nouveau |
| T-019 | La barre de l'accueil n'a pas son repli Android | front | confort | avis-requis | nouveau |
| T-020 | On ne saurait pas qu'une visiteuse décroche | exploitation | serieux | avis-requis | nouveau |
| T-021 | Le crédit fondateur de 30 € est entièrement manuel | paiement | serieux | avis-requis | nouveau |
| T-022 | Les mails tombent dans l'onglet Promotions de Gmail | exploitation | serieux | avis-requis | nouveau |
| T-023 | 734 photos orphelines dorment sur R2 | donnees | confort | avis-requis | nouveau |
| T-024 | La page Santé crie sur une base vide | admin | confort | libre | nouveau |
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
| T-035 | Le chemin qui encaisse n'a aucun filet automatique | paiement | serieux | libre | nouveau |
| T-036 | Un rebond « invalid » pourrait être ignoré en silence | atelier | serieux | libre | **fermé** |
| T-037 | Un signalement en spam est enregistré mais invisible | admin | serieux | libre | nouveau |
| T-038 | Le webhook des rebonds dit oui à Brevo même quand il n'a rien écrit | atelier | serieux | libre | **fermé** |
| T-039 | Le webhook des rebonds n'écoute rien tant qu'il n'est pas branché | exploitation | serieux | avis-requis | **fermé** |
| T-040 | N'importe qui peut se déclarer ambassadeur à la place d'une cliente | paiement | bloquant | avis-requis | **fermé** |
| T-041 | La relève quotidienne écrit les tokens des clientes dans les logs | atelier | serieux | libre | **fermé** |
| T-042 | La vignette d'une photo supprimée reste dans le coffre | donnees | serieux | libre | **fermé** |
| T-043 | Une panne de base fait dire à la cliente que son dossier n'existe pas | atelier | serieux | libre | nouveau |
| T-044 | Deux colonnes récentes n'ont pas le filet que toutes leurs voisines ont | donnees | serieux | libre | nouveau |
| T-045 | On peut savoir qui est cliente de Bellajour, avec son prénom | paiement | serieux | libre | nouveau |
| T-046 | La porte de l'atelier se laisse tester à l'infini | admin | serieux | libre | nouveau |
| T-047 | Un paiement sous alias n'attribuerait aucun numéro de fondateur | paiement | confort | avis-requis | nouveau |
| T-048 | La garantie « pas d'objet sans ligne » n'existe pas vraiment | donnees | confort | libre | nouveau |
| T-049 | L'adresse de retour après paiement n'est pas vérifiée | paiement | serieux | avis-requis | nouveau |
| T-050 | Sans JavaScript, le site sert un écran noir — y compris la page qui fait payer | front | bloquant | libre | **fermé** |
| T-051 | Le questionnaire est muet pour qui n'utilise pas la souris | front | serieux | libre | nouveau |
| T-052 | On refuse une histoire trop courte sans jamais dire qu'elle est trop courte | front | serieux | libre | nouveau |
| T-053 | Les seuls libellés de l'écran des coordonnées sont illisibles | front | serieux | libre | nouveau |
| T-054 | Une photo qui n'est pas partie ne se voit pas, et le bouton reste actif | front | serieux | libre | nouveau |
| T-055 | La loupe laisse atteindre le bouton payer, invisible sous le fond noir | front | serieux | libre | nouveau |
| T-056 | La page qui suit le paiement se recharge cinq fois sans prévenir | front | serieux | libre | nouveau |
| T-057 | Les CGV portugaises, qui font foi, sont servies dans un document déclaré français | produit | serieux | libre | nouveau |
| T-058 | Un lien de reprise tronqué fait recommencer tout, et crée un second dossier | atelier | serieux | libre | nouveau |
| T-059 | Une police jamais peinte retarde l'apparition du premier écran | front | serieux | libre | nouveau |
| T-060 | 164 Ko d'images du deuxième écran descendent pendant que le premier s'affiche | front | serieux | libre | **fermé** |
| T-061 | Le chemin de fer fait saccader le téléphone alors qu'il n'y est pas affiché | front | serieux | libre | nouveau |
| T-062 | Le grain refond l'écran entier à chaque frame de défilement | front | serieux | libre | nouveau |
| T-063 | 62 % de la feuille servie sur tout le site vise des pages archivées | front | serieux | libre | nouveau |
| T-064 | Trente déclarations de police jamais peintes bloquent le rendu de chaque page | front | confort | libre | nouveau |
| T-065 | Aucune image du site n'a de variante pour téléphone | front | serieux | libre | nouveau |
| T-066 | Ouvrir le questionnaire télécharge tout le moteur d'envoi de photos | front | serieux | libre | nouveau |
| T-067 | Une page indexable vend encore un programme qu'on n'honore plus | produit | serieux | avis-requis | nouveau |
| T-068 | Le site déclare deux fiches produit concurrentes pour un seul produit | front | serieux | libre | nouveau |
| T-069 | L'image de partage promet un album, et peut casser le déploiement entier | front | serieux | avis-requis | nouveau |
| T-070 | Le retour des pages légales renvoie sur une page supprimée | front | confort | libre | **fermé** |
| T-071 | Personne ne serait prévenu si Google rejetait le site | exploitation | confort | avis-requis | nouveau |
| T-072 | Les prix finaux du magazine ne sont pas tranchés | paiement | serieux | avis-requis | nouveau |
| T-073 | Commander plusieurs exemplaires, avec des paliers dégressifs à fournir | paiement | serieux | avis-requis | nouveau |
| T-074 | Un prix selon le pays de livraison exige de demander le pays avant le prix | produit | serieux | avis-requis | nouveau |
| T-075 | Les ventes de l'atelier ne passent pas par la comptabilité InvoiceXpress | paiement | serieux | avis-requis | nouveau |
| T-076 | Les dossiers abandonnés gardent leurs données personnelles sans limite de durée | donnees | serieux | avis-requis | nouveau |
| T-077 | Les specs d'impression des deux produits Cloudprinter ne sont pas sur le disque | produit | serieux | avis-requis | nouveau |
| T-078 | Aucun moteur ne transforme les gabarits de mise en page en PDF imprimable | atelier | serieux | avis-requis | nouveau |
| T-079 | Le dashboard métriques n'a pas d'insights ni de stratégie assistés par IA | admin | confort | avis-requis | nouveau |
