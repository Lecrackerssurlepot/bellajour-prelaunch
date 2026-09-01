---
id: T-058
titre: Un lien de reprise tronqué fait recommencer tout, et crée un second dossier
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/(atelier)/composer/Composer.tsx:62-64` — un `?reprendre=` dont la forme est invalide met
`estReprise` à `false` et **poursuit en silence**.
Le token fait 32 caractères : un client mail qui coupe une URL longue suffit. La cliente est
renvoyée à l'écran 1 sans un mot, avec son ancien brouillon local. Elle refait le questionnaire, et
`creerNumero` crée un **SECOND dossier**.
Résultat dans l'atelier : deux demandes de la même personne, deux M0, deux comptes à rebours de
48 h, et personne ne sait lequel porte ses photos.
⚠️ C'est exactement le scénario de reprise que la recette du 28/08 signalait comme « jamais
testé » — le seul point du parcours qui n'a jamais été éprouvé en vrai.
## Ce que je propose
Ne jamais poursuivre en silence : si un `?reprendre=` est présent mais illisible, le dire et
proposer le lien permanent (celui de M0) plutôt que de repartir à zéro.
Et côté atelier, détecter deux dossiers ouverts pour la même adresse — c'est le filet.
## Ce qui a été fait
**31/08/2026 — confirmé, corrigé (première moitié).** `Composer.tsx` : un `?reprendre=` présent
mais de forme invalide ne poursuit plus en silence — l'effet de reprise pose `lienAbime` et
s'arrête AVANT `setPret`, donc le brouillon local n'est jamais réécrit. Un écran dédié le dit
(« Ce lien de reprise est abîmé ») et renvoie vers le lien entier du mail ; « Composer un autre
numéro » reste possible, en lien discret (`/composer` nu, rechargement qui purge le paramètre).
Vérifié au navigateur (`/composer?reprendre=tronque123`, 375 px et desktop) : écran bloquant,
aucun doublon possible.
**Reste ouvert** : le filet côté atelier (détecter deux dossiers ouverts pour la même adresse)
n'est pas fait — il touche l'admin, hors périmètre de cette passe.

**Fermé le 01/09/2026.** Le doublon ne peut plus naître par un lien tronqué, qui était la cause
nommée par le titre. Le filet côté atelier — deux dossiers ouverts sur la même adresse, quelle
qu'en soit la cause — est parti dans **T-084**.
