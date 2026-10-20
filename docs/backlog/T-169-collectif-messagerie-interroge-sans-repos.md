---
id: T-169
titre: La messagerie interroge le serveur toutes les 3,5 secondes, même quand rien ne bouge
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/lib/collectif/messages.ts:13` `INTERVALLE_MESSAGES_MS = 3500`, appliqué tel quel par
  `src/app/edition/_composants/useMessagerie.ts:64` tant que l'onglet est visible, côté client
  comme côté atelier ; deux requêtes en base par tour.
- CALCULÉ (audit du 19/10) : ≈ 1 029 appels de fonction par heure et par écran ouvert,
  ≈ 180 000 par mois pour un seul onglet laissé ouvert en journée. **Non vérifié** : le quota
  d'appels du plan Vercel Hobby (de l'ordre du million par mois à ma connaissance) et notre
  consommation actuelle. L'atelier des particuliers, lui, ne rafraîchit qu'une fois par minute.

## Ce que je propose
Ralentir quand rien n'arrive (3,5 s juste après un message, puis 10 s, 30 s, 60 s), repartir vite
à la frappe ou au retour sur l'onglet. Relever la consommation réelle dans Vercel avant et après.

## Ce qui a été fait
- 20/10 (lot a4, branche du worktree `agent-af09df87f99d7a793`, NON fusionné) : décision de
  Mathias, « on l'optimise pour que ce soit pas le cas, sans poser aucun problème ».
- La règle pure : `PALIERS_MESSAGES` et `intervalleMessages` (`src/lib/collectif/messages.ts`).
  3,5 s la première minute après un mouvement (PRD §7), 10 s jusqu'à 3 min, 30 s jusqu'à 10 min,
  puis 60 s (le rythme de la table de travail et de `VeilleMessages`). Une durée illisible ou
  négative rend le palier rapide.
- Le hook (`useMessagerie.ts`) : un `setTimeout` réarmé après chaque relève (plus de
  `setInterval`), jamais d'interrogation onglet caché, relève immédiate et palier rapide au retour
  sur l'onglet. Un mouvement (ouverture, message reçu ou envoyé, frappe `input` n'importe où dans
  la page) AVANCE la relève prévue si elle part plus tard que 3,5 s, ne la recule jamais. Une
  relève qui lève une exception n'arrête plus les suivantes (avant, `enCours` restait vrai).
- `VeilleMessages` reste à la minute (déjà au palier le plus lent, un seul nombre lu) : commentaire
  seulement.
- Compté au harnais (modèle de la minuterie) : un onglet ouvert une heure sans rien faire
  interroge 93 fois au lieu de 1 028 ; huit heures, 513 au lieu de 8 228. Une frappe ramène la
  relève suivante à 3,5 s au plus. CALCULÉ, pas relevé dans Vercel : la consommation réelle
  avant/après reste à lire dans le tableau de bord Vercel après déploiement.
- Non vérifié dans un navigateur : le hook n'a pas tourné dans une page (le fil de « Parler à
  l'atelier » n'a pas été ouvert ici). Les commentaires de `Parler.tsx` et
  `ConversationAtelier.tsx` disent encore « 3,5 s » (hors du lot, non touchés).
