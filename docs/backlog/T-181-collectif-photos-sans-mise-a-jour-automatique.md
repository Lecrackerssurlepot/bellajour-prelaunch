---
id: T-181
titre: Le responsable ne voit les photos des participants arriver qu'en rechargeant la page
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« J'ai testé le QR code donc, dans un espace, voilà, en tant que particulier responsable et
c'était super, l'envoi a bien fonctionné. Bon, j'ai envoyé que 12 photos, c'était un premier
test, ça a bien fonctionné. Par contre, ça ne met pas à jour en automatique sur la plateforme
pour le responsable sans le refresh. » (19/10/2026)

## Ce que j'ai vérifié (19/10)
- Page Photos : `Collecte.tsx` charge par `fetch("/api/collectif/photos")` au montage
  (`:197-199`), puis seulement après les envois et les gestes du responsable lui-même
  (`:192`, `:211-226`). Aucun intervalle, aucun `visibilitychange`, aucun `router.refresh`.
- Tableau de bord : `edition/[token]/page.tsx` est serveur, `CartePhotos.tsx` ne fait aucun
  fetch. Le total reste figé jusqu'au rechargement.
- Il n'existe aucune lecture légère du nombre de photos : `/api/collectif/photos` lit toutes
  les photos (`limit(20000)`), recalcule les doublons (T-170) et signe jusqu'à 120 vignettes.
  La sonder en boucle serait ruineux.
- Patron existant : `admin/atelier/Rafraichissement.tsx` (60 s, arrêt onglet caché, rattrapage
  au retour). La messagerie sonde à 3,5 s (T-169 veut la ralentir) : ne pas reproduire.

## Ce que je propose
1. Une route légère (POST, token dans le corps, comme les autres routes publiques) qui ne rend
   que le nombre de photos confirmées et l'instant de la dernière (`count: exact, head: true`
   + une ligne).
2. Interrogée toutes les 30 s sur Photos, chaque minute sur le tableau de bord, jamais onglet
   caché, rattrapage au retour. Elle ne relit la grille (`relire()`) ou la page
   (`router.refresh()`) que si le nombre a changé.
3. L'annonce « 12 nouvelles photos de Mathias, à l'instant » et les vignettes neuves marquées
   (planche 3 du canevas du 19/10).
Charge : 120 appels par heure et par onglet ouvert sur Photos, à mettre en regard de T-169.

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planche 3 telle quelle (les arrivées en direct).

## Ce qui a été fait
19/10, même branche (planche 3) :
- `/api/collectif/photos/etat` : un compte en `head`, et qui a envoyé depuis la dernière vue
  (300 lignes au plus) ; lecture seule, `chargerAcces` + `peut(voir_espace)`, `no-store`.
- `useSondage` (onglet visible seulement, rattrapage au retour après 20 s) : 30 s sur Photos,
  60 s sur le tableau de bord ; `arrivees.ts` (pur) dit la phrase (« 12 nouvelles photos de
  Mathias », « … de Léa, Inès et 2 autres personnes », « Plus de 300… »), jamais pour les envois
  du responsable lui-même.
- Photos : l'annonce au-dessus de la grille, le compte d'en-tête mis à jour aussitôt, « Les
  voir » ouvre la personne (ou toutes les photos) avec les nouvelles marquées ; « Toutes »
  montre la dernière arrivée d'abord. Tableau de bord : « N nouvelles photos, à l'instant ·
  Les voir », et la page se relit.
- Vérifié au pilote, réponse de la lecture légère FAUSSÉE (3 photos de Léa) : l'annonce paraît
  au bout de 30 s sur Photos, au bout d'une minute sur le tableau de bord, avec UNE seule
  lecture légère en 63 s ; aucune écriture. **Non vu en vrai** : une arrivée réelle pendant que
  l'écran est ouvert (il faudrait déposer une photo en production), ni les vignettes marquées
  « nouvelle » sur de vraies données.