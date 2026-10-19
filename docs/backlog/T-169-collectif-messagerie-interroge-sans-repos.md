---
id: T-169
titre: La messagerie interroge le serveur toutes les 3,5 secondes, même quand rien ne bouge
etat: nouveau
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
Rien encore.
