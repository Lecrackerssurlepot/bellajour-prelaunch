---
id: T-101
titre: La connexion Google de toutes les clientes dépend d'un seul compte personnel
etat: nouveau
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-09-07
---

## Ce que Mathias a dit

« je mets Louis en propriétaire » — puis, dans la foulée : « Enregistre la demande on le fera
plus tard ! »

## Ce que j'ai vérifié

Le check-up du projet Google Cloud `bellajour-507615` le signale lui-même, capture à l'appui le
07/09 : **« Contacts du projet — Votre application ne comporte pas le nombre requis de
propriétaires/éditeurs de projet. »**

Le projet n'a donc qu'un seul propriétaire, le compte Google **personnel** de Mathias. Or c'est
ce projet qui porte le client OAuth `739999270303-…` par lequel passe **toute** connexion
« Continuer avec Google » de bellajour.fr. Si ce compte devient inaccessible — perdu, piraté,
suspendu — plus personne ne peut réparer la connexion des clientes, et personne d'autre ne peut
récupérer le projet.

Rien ne casse aujourd'hui : c'est un point de rupture, pas une panne.

## Ce que je propose

Ajouter **Louis** comme second **Propriétaire** (décision de Mathias, 07/09) :
console Google Cloud → projet **Bellajour** (`bellajour-507615`, ⚠️ pas Eventease) →
☰ IAM et administration → IAM → « Accorder l'accès » → adresse Google de Louis →
rôle **Propriétaire** → Enregistrer.

⚠️ **C'est un geste dans la console, hors dépôt : je ne peux pas l'exécuter**, seulement le
vérifier après coup. Le ticket est classé `libre` parce que la grille le veut (il ne touche ni
mail, ni prix, ni migration, ni texte légal, ni impression, ni suppression), mais son exécution
appartient à Mathias.

Deux points à connaître avant de cliquer :
- Louis reçoit une **invitation par mail qu'il doit accepter** ; tant qu'il ne l'a pas fait,
  l'accès n'est pas effectif et l'avertissement de Google reste.
- Le rôle Propriétaire donne aussi la facturation et la suppression du projet. Le rôle Éditeur
  suffirait au quotidien, mais **ne permettrait pas de récupérer le projet** si le compte de
  Mathias disparaissait — c'est-à-dire exactement le risque qu'on cherche à couvrir. Mathias a
  tranché pour Propriétaire.

⚠️ Ne pas confondre avec l'adresse d'assistance de l'écran de consentement, qui est un autre
sujet (l'adresse perso de Mathias, assumée, et modifiable sans rien casser).

Comment on saura que c'est fait : l'avertissement « Contacts du projet » disparaît du check-up,
et la connexion Google continue de fonctionner (à revérifier, une suppression de droits mal
faite se verrait là).

## Ce qui a été fait

(rien)
