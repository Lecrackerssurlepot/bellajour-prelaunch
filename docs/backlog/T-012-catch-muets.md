---
id: T-012
titre: Trente `catch` muets sur des chemins qui écrivent
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
Plus de trente `catch {}` sans variable ni log, dont plusieurs côté serveur sur des chemins qui
écrivent : `api/webhook/route.ts:650`, `api/atelier/photos/complete/route.ts:62`,
`api/cloudprinter/webhook/route.ts:57`, `api/admin/atelier/interne/route.ts:33`,
`admin/atelier/[token]/telechargement.ts:80,165`. Et `lib/atelier/r2.ts:255` avale l'échec d'une
suppression (objet orphelin sur R2).
Tous ne sont pas fautifs — certains protègent volontairement un chemin best-effort. Le défaut est
qu'on ne peut pas les distinguer.
## Ce que je propose
Passer les trente en revue et les trier en trois : (a) volontaire, alors un commentaire d'une
ligne le dit ; (b) devrait journaliser, alors `logEvenement` ou `console.error` ; (c) ne devrait
pas être attrapé du tout. Ne rien changer au comportement sans savoir dans quelle catégorie on est.
## Ce qui a été fait
**31/08/2026 — recensement complet et traitement, séance close avant exhaustivité totale.**

Recensement : ~80 `catch` dans `src/`. Le compte de l'audit du 29/08 a beaucoup bougé : les
chantiers récents (T-038, T-041, T-043, mails, paiement, frein-login, routes photos,
fondatrice-code) avaient déjà traité la plupart des cas serveur. Quatre des six occurrences
citées dans la fiche étaient déjà réparées (`webhook/route.ts:650` logge, `photos/complete`
documente son best-effort, `interne/route.ts:33` est une validation d'URL, `r2.ts` `supprimer`
logge). Tout le côté client (admin, /numero, /composer, ambassadeurs) affiche l'erreur à
l'écran ou porte un commentaire qui dit pourquoi le silence est voulu.

Corrigé ce jour (voix ajoutée, zéro changement d'écran) :
- `src/lib/atelier/r2.ts` — `tailleReelle` et `empreinteObjet` confondaient panne R2 et objet
  absent (le piège T-043). Nouveau prédicat PUR `estAbsenceR2` : 404/NotFound = absence,
  silence voulu ; tout le reste = panne, `console.error`, mais rend toujours `null` (l'appelant
  réessaie, comportement inchangé). Testé dans `scripts/verif-atelier.ts` (7 cas).
- `src/app/api/cloudprinter/webhook/route.ts` — T-038 appliqué : sur les trois signaux dont le
  journal `evenements` est le SEUL effet (`cloudprinter_erreur`, `cloudprinter_signal`,
  `cloudprinter_signal_inattendu`), le résultat de `logEvenement` est lu et un échec rend 500 —
  leur retry (100 tentatives / 7 jours) réécrit la ligne. L'`etat_change` après update reste
  volontairement ignoré (l'état est déjà écrit, un rejeu tomberait sur la garde d'idempotence) :
  commenté.
- `src/app/api/checkout/route.ts:140` — `makeSupabase` en échec rendait 500 sans un mot.
- `src/app/api/waitlist/count/route.ts` — la panne affichait « 0 inscrite » sans trace ; le 0
  de repli reste, la panne se logge.
- `src/app/merci/page.tsx` — une panne Stripe ou base montrait « lien invalide » à quelqu'un qui
  venait de payer, indistinguable d'un session_id bidon ; l'écran ne change pas, le log distingue.

Vérifié : `npx tsc --noEmit` propre, `npm run lint` propre, `verif-atelier.ts` TOUT PASSE.

Restants, assumés muets ou hors périmètre (rien d'écrit chez un tiers) :
- validations pures (`transitions.ts:253`, `interne/route.ts:33`, `ambassadeur-token.ts`) — le
  `catch` EST la règle (URL/token invalide → false/null), doc en tête de fonction ;
- parse de corps de requête (`request.json()` → 400) — la réponse d'erreur est la voix ;
- `signerGet(...).catch(() => null)` (donnees.ts, lot/route.ts) — lecture d'affichage admin,
  commentaires en place (« jamais une fiche en erreur ») ;
- stockage navigateur (draft.ts, stockage.ts, Vues.tsx), clipboard, workers (pool.ts) — tous
  commentés, best-effort local sans écriture distante ;
- `photos/complete:62` (`vignetteArrivee`) — route photos traitée le 30/08, fait foi ; gagne au
  passage la voix de `tailleReelle` sans avoir été touchée.
