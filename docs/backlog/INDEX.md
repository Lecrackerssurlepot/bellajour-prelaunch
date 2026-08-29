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
| T-001 | Le numéro de suivi n'est jamais enregistré | donnees | bloquant | avis-requis | nouveau |
| T-002 | Les liens de parrainage des mails vivants sont morts | contenu | bloquant | avis-requis | nouveau |
| T-003 | 101 Mo d'images orphelines déployées à chaque build | front | serieux | libre | nouveau |
| T-004 | La page d'état de la cliente est indexable par Google | front | serieux | libre | nouveau |
| T-005 | L'ancien mot de passe admin partagé ouvre encore la porte | admin | serieux | libre | nouveau |
| T-006 | Un album de 29 pages n'est couvert par aucune ligne des CGV | produit | serieux | avis-requis | nouveau |
| T-007 | Un mail sans template se saute en silence, à l'infini | atelier | serieux | libre | nouveau |
| T-008 | Le rate-limit ne limite rien sur Vercel | paiement | serieux | libre | nouveau |
| T-009 | Aucune page n'a de canonical | front | serieux | libre | nouveau |
| T-010 | Rien ne vérifie le code avant un commit | exploitation | serieux | libre | nouveau |
| T-011 | `.env.example` cache douze variables vivantes | exploitation | serieux | libre | nouveau |
| T-012 | Trente `catch` muets sur des chemins qui écrivent | atelier | serieux | libre | nouveau |
| T-013 | Les pages animées ignorent « réduire les animations » | front | confort | libre | nouveau |
| T-014 | Le sitemap ment sur ses dates | front | confort | libre | nouveau |
| T-015 | Deux modules morts traînent dans le code vivant | exploitation | confort | libre | nouveau |
| T-016 | Les quatre composants de l'ancienne accueil ont fini leur office | front | confort | libre | nouveau |
| T-017 | Le focus au clavier est invisible sur la moitié du site | front | confort | libre | nouveau |
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
| T-029 | Deux avertissements de lint traînent depuis le lot 7 | exploitation | confort | libre | nouveau |
| T-030 | Vérifier si la couverture d'un seul tenant est déjà livrée | atelier | confort | libre | nouveau |
| T-031 | Une erreur en production n'est vue par personne | exploitation | serieux | avis-requis | nouveau |
| T-032 | On n'a jamais vérifié qu'une sauvegarde se restaure | donnees | serieux | avis-requis | nouveau |
| T-033 | Aucun processus pour effacer les données d'une cliente | donnees | serieux | avis-requis | nouveau |
| T-034 | Aucun plan de retour arrière si un déploiement casse la vente | exploitation | confort | libre | nouveau |
| T-035 | Le chemin qui encaisse n'a aucun filet automatique | paiement | serieux | libre | nouveau |
| T-036 | Un rebond « invalid » pourrait être ignoré en silence | atelier | serieux | libre | **fermé** |
| T-037 | Un signalement en spam est enregistré mais invisible | admin | serieux | libre | nouveau |
| T-038 | Le webhook des rebonds dit oui à Brevo même quand il n'a rien écrit | atelier | serieux | libre | **fermé** |
| T-039 | Le webhook des rebonds n'écoute rien tant qu'il n'est pas branché | exploitation | serieux | avis-requis | **fermé** |
