---
id: T-178
titre: Six composants appellent setState directement dans un effet, ce que la nouvelle règle de lint de React refuse
etat: nouveau
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Fais la mise à jour de Next.js » (19/10/2026).

## Ce que j'ai vérifié
- 19/10 : `eslint-config-next` 16.4.2 tire `eslint-plugin-react-hooks` 7.1.1. Sa règle lève 6
  erreurs dans du code inchangé (« Calling setState synchronously within an effect can trigger
  cascading renders », et un « impure function during render ») :
  `src/app/(atelier)/composer/Composer.tsx:254`, `src/app/admin/atelier/Rafraichissement.tsx:113`,
  `src/app/admin/atelier/[token]/Fiche.tsx:697`, `src/app/components/useReferralShare.ts:99`,
  `src/app/edition/[token]/atelier/Reservation.tsx:68`, `src/app/edition/[token]/photos/Collecte.tsx:198`.
- Pour ne pas réécrire le questionnaire au milieu d'une mise à jour de sécurité,
  `eslint-config-next` est resté en 16.2.3 (et `eslint-plugin-react-hooks` en 7.0.1).

## Ce que je propose
Reprendre les six cas un par un (souvent : dériver la valeur pendant le rendu, ou la poser dans
le gestionnaire d'événement), vérifier chaque écran, puis monter `eslint-config-next` en 16.4.2.
`Composer.tsx` est dans le tunnel : relire `docs/reference/PARCOURS-INVARIANTS.md` avant.

## Ce qui a été fait
Rien encore.
