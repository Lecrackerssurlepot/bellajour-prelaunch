---
id: T-167
titre: Au-delà de 1 000 photos, une édition perdrait des photos sans rien dire (grille, plafond total, lot de l'atelier)
etat: fermé
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- Audit de performance du 19/10, revérifié : sept lectures de `collectif_photos` comptent sur
  `.limit(20000)` pour tout ramener (`src/app/edition/[token]/donnees.ts:191`,
  `src/app/api/collectif/photos/route.ts:84`, `photos/marquer/route.ts:95`,
  `dossiers/route.ts:77`, `src/app/api/admin/collectif/editions/[id]/lot/route.ts:61`,
  `src/lib/collectif/collecte.ts:60`, `src/app/admin/collectif/donnees.ts:281`).
- Supabase plafonne par défaut chaque réponse à 1 000 lignes (réglage « Max rows » de l'API), et
  `.limit()` ne peut que réduire. **Confirmé le 19/10 par Mathias** dans les réglages de
  Supabase : « Max rows = 1000 ». Aucune table n'a encore 1 000 lignes (19/10 : 879 photos
  d'édition en tout, 782 pour la plus grosse) : le défaut n'a encore touché personne. Le code des métriques pagine déjà par 1 000 (`metriques.ts:205`).
- Le PRD vise 1 000 à 2 000 photos par édition. Si le plafond est à 1 000 : la grille et le
  tableau de bord s'arrêtent à 1 000 ; `compterPourPlafond` ne dépasse jamais 1 000, donc le
  plafond total ne s'applique plus ; « Télécharger le lot » omet en silence les photos au-delà,
  et l'atelier compose le magazine sans elles.

## Ce que je propose
compter par `count: "exact"` là où seul le nombre sert, et paginer par tranches de 1 000
ordonnées (patron de `metriques.ts`) là où il faut les lignes. Un test au harnais avec une
lecture simulée plafonnée. **À faire avant la première vraie édition.**

## Ce qui a été fait
- PR #271 (19/10 au soir, en production) : les lectures de `collectif_photos` passent par
  `src/lib/collectif/lignes.ts` (tranches de 1 000, jusqu'à 100 tranches, soit 100 000 lignes, et
  une erreur `trop_de_lignes` au-delà, jamais une troncature muette) ; les plafonds se comptent
  en base (`collecte.ts`) ; le lot vérifie son compte avant de partir. Relu sur main le 20/10.
