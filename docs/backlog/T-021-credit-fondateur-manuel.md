---
id: T-021
titre: Le crédit fondateur de 30 € est entièrement manuel
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« L'admin affiche "30 € à imputer" (CGV art. 5 bis) mais il faut créer un code Stripe nominatif
à usage unique et l'envoyer à la main. Tenable à deux fondateurs, pas au-delà. »
## Ce que j'ai vérifié
Repris de `docs/ATELIER-A-FAIRE.md`. À confirmer dans le code avant d'agir.
Quatorze fondateurs ont des droits ouverts ; l'article 5 bis des CGV v3.0 engage l'imputation.
## Ce que je propose
Automatiser la création du code Stripe nominatif à usage unique au moment où l'admin le décide,
avec vérification préalable dans `waitlist` (comme l'exige l'article). Le geste reste déclenché
à la main : c'est de l'argent.
**Question pour Mathias** : combien de fondateurs ont déjà été servis à la main ? Le seuil qui
rend l'automatisation rentable, c'est le nombre restant.
## Ce qui a été fait
30/08 : la création du code est automatisée, le geste reste humain. Route POST
`/api/admin/atelier/fondatrice-code` (auth admin) : re-vérifie `waitlist`
(founder + confirmed + email canonique) côté serveur, crée le coupon Stripe (30 €, `once`)
et le promotion code `FONDATRICE-<nº>-<4 car.>` (`max_redemptions: 1`), journalise
`code_fondatrice_cree` dans `evenements` — qui sert aussi de verrou d'idempotence (un second
clic REND le code existant). Aucune migration, aucune colonne. La fiche admin affiche le code
en copiable avec sa date, ou le bouton « Créer le code de 30 € ». Le code ne part dans AUCUN
mail. Erreur Stripe = rien au journal ; clé absente = message clair.
RESTE À TRANCHER par Mathias : l'envoi à la cliente (automatique ou manuel) — l'UI le dit en
toutes lettres. NON TESTÉ contre l'API Stripe réelle : premier clic à faire par l'admin.

01/09 — **TRANCHÉ PAR MATHIAS : automatique.** « Pourquoi envoyé à la main ? Faire quelque chose
d'automatique, envoyé à la cliente dans le mail du lien de paiement, et qui s'affiche aussi dans
Stripe si possible, mais qui est unique. » La cliente ne tape plus rien.

**Ce qui a été construit**
- `src/lib/atelier/fondatrice.ts` — nouveau module partagé. Porte la règle pure (éligibilité,
  montant, codes lisibles, unicité, collision) et l'orchestration `assurerCreditFondatrice`
  (réutilise le code existant, en frappe un sinon, ne rend jamais un code que Stripe refuserait).
  Le raisonnement de sécurité et ses quatre bornes sont écrits en tête de fichier.
- `/api/atelier/checkout` — relit `waitlist` lui-même avant de créer la session et pose
  `discounts: [{ promotion_code }]`. ⚠️ `allow_promotion_codes` est RETIRÉ dans ce cas (Stripe
  interdit les deux ensemble : ça ferait échouer le paiement). Sans crédit, le champ code promo
  reste, comme avant. Le vieux commentaire « pourquoi pas automatique » est remplacé.
- **Unicité** : `max_redemptions: 1` chez Stripe (l'autorité) + `evenements`. ⚠️ La clé du journal
  est `numero_fondateur`, PAS `numero_id` : le crédit appartient à la personne, donc un second
  numéro commandé par la même fondatrice ne rouvre pas un second droit de 30 €. C'était un trou
  de la version du 30/08.
- **Dans Stripe** : le code, le numéro de fondatrice et le montant sont posés en métadonnées de
  session (visibles sur le paiement et la facture), en plus du coupon nommé
  « Crédit fondatrice nºX (CGV art. 5 bis) ».
- **Journal** : `credit_fondatrice_applique` (checkout) et `credit_fondatrice_consomme` (webhook
  Stripe, quand la remise a réellement décompté). Les deux sont racontés par `recit.ts` sans
  révéler le code. `checkout_ouvert` porte désormais `credit_fondatrice_centimes`.
- **Mails M3 et M3b** : nouveau paramètre `CREDIT_FONDATRICE` (« 30 » ou vide), calculé par une
  lecture SEULE (`creditDuPourMail` ne crée rien chez Stripe). Bloc `{% if params.CREDIT_FONDATRICE %}`
  ajouté aux deux sources dans `scripts/mails-atelier.mjs`. M3b l'a aussi parce qu'il porte le même
  lien de paiement : le taire là aurait contredit M3.
- **La route admin manuelle reste** comme filet, réécrite pour appeler le même module : plus une
  ligne de logique dupliquée, donc jamais deux codes.
- **Harnais** : 40 assertions ajoutées à `scripts/verif-atelier.ts` (éligibilité, montant, unicité
  Stripe et journal, codes et collision, paramètres M3/M3b).

**NON TESTÉ contre l'API Stripe réelle.** Aucun appel n'a été passé depuis cette séance.

**À VÉRIFIER AU PREMIER VRAI PAIEMENT FONDATRICE**
1. La page Stripe affiche bien « -30,00 € » et AUCUN champ « code promo ».
2. Le coupon et le promotion code apparaissent au dashboard, `max_redemptions 1`, `times_redeemed 1`
   après le paiement.
3. La fiche admin raconte « Crédit fondatrice de 30 € appliqué automatiquement » puis
   « Crédit fondatrice dépensé ».
4. Un second clic sur « Commander » (panier abandonné puis repris) réutilise le MÊME code, n'en
   frappe pas un second.
5. **Le palier 30 € tombe à zéro** : un numéro de 20 à 28 pages devient gratuit pour une
   fondatrice. Stripe se solde alors en `no_payment_required` et le dossier n'a AUCUN
   `payment_intent`. Vérifier que la facture est quand même émise et que l'état passe à `payee`.
6. Les templates M3 et M3b doivent être POUSSÉS avant que le bloc n'apparaisse dans les mails :
   `node scripts/mails-atelier.mjs --pousser --seulement M3,M3b`. Non fait ici (interdit nº2).
